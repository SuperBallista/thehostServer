// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GameInRedis, GamePlayer, GamePlayerInRedis, GameRegionInRedis, Host} from './game.types';
import { RedisService } from 'src/redis/redis.service';
import { UserService } from 'src/user/user.service';
import { WsException } from '@nestjs/websockets';
import { LocationState, userShortInfo } from '../data.types';
import { Room, State, SurvivorInterface } from '../payload.types';
import { getOrderRandom } from '../utils/randomManager';
import { userDataResponse } from '../payload.types';


@Injectable()
export class GameService {
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly userService: UserService,
  ) {}


  async gameStart(userId: number): Promise<userDataResponse>{
    const state: LocationState = await this.redisService.getAndParse(`locationState:${userId}`)
    if (!state || !state.roomId) throw new WsException('방을 찾을 수 없습니다')   
    
    const roomData: Room = await this.getWaitRoomData(state.roomId)
    
    // 방장 권한 확인
    if (roomData.hostUserId !== userId) {
      throw new WsException('게임을 시작할 권한이 없습니다')
    }
    
    const gameData: userDataResponse = await this.makeGameData(roomData) // 게임 데이터 생성
    if (!roomData.date) throw new WsException('색인 오류가 발생하였습니다')
    await this.deleteWaitingRoomList(roomData.id, roomData.date)

    return gameData
}

private async getWaitRoomData(roomId: string): Promise<Room> {
const roomData = await this.redisService.getAndParse(`room:data:${roomId}`)
if (!roomData) throw new WsException('방정보가 없습니다')
return roomData
}

private async deleteWaitingRoomList(roomId: string, timeStamp: number) {
    await this.redisService.del(`room:list:${timeStamp}`)
    await this.redisService.del(`room:data:${roomId}`)
}

private async makeGameData(roomData: Room): Promise<userDataResponse> {
    roomData.players = await this.fillBotPlayer(roomData) // 봇 채우기
    const hostPlayer = await this.selectHost(roomData.players) // 숙주 뽑기
    const shuffledPlayer = getOrderRandom(roomData.players) // 유저 섞기
    const players = await this.setPlayerInformation(shuffledPlayer, hostPlayer) // 게임 플레이어 세팅
    
    // 게임 데이터 세팅 준비 완료
    await this.createNewGameData(roomData.id, hostPlayer, players) // 게임 생성

    // ✅ 모든 플레이어에게 게임 시작 알림
    const playerIds = roomData.players.map(p => p.id);
    await this.redisPubSubService.publishGameStart(roomData.id, roomData.id, playerIds);

    return { locationState: 'game' }
}

private async selectHost(players: userShortInfo[]): Promise<number> {
 return Math.floor(Math.random() * players.length)
}

private async fillBotPlayer(roomData: Room): Promise<userShortInfo[]> {
if (roomData.bot) {
  let i = 1
  while (roomData.players.length < 20) {
  roomData.players.push({ nickname: `botPlayer${i}`, id: i * -1 })
  i++
  }
}
return roomData.players
}

private setPlayerInformation(players: userShortInfo[], hostPlayer: number): GamePlayer[] {
  let regionNumber = 6
  if (players.length < 10) {
    regionNumber = 3
  } else if (players.length < 14) {
    regionNumber = 4
  } else if (players.length < 18) {
    regionNumber = 5
  } // 인원별로 구역 갯수 설정

  const gamePlayers = players.map((player, index) => 
    new GamePlayer(index, player.id, Math.floor(Math.random() * regionNumber), index === hostPlayer, regionNumber)
  ) // 게임플레이어 객체 세팅

  return gamePlayers
}


private async createNewGameData(gameId: string, hostPlayer: number, players: GamePlayer[]) {
    const gameData = new Game(gameId, hostPlayer) // 게임 데이터 객체 생성
    const gameDataIndex = `game:${gameData.gameId}` // 게임방 키값 변수로 저장
    
    await this.redisService.stringifyAndSet(gameDataIndex, gameData.recordData()) // 게임 생성
    
    const newHost: Host = { hostId: hostPlayer, turn: true, infect: null }
    await this.redisService.stringifyAndSet(`${gameDataIndex}:host`, newHost) // 숙주 데이터 생성
    
    for (const player of players) {
      await this.redisService.stringifyAndSet(`${gameDataIndex}:player:${player.playerId}`, player.recordData())
    } // 플레이어 데이터 생성

    // 구역 데이터 생성
    for (let i = 0; i < 6; i++) {
      await this.redisService.stringifyAndSet(`${gameDataIndex}:region:${i}:turn:1`, {
        regionId: i, 
        turn: 1, 
        chatMessage: [],
        regionMessage: []
      })
    }
}

async subscribeGameStart(client: any, userId: number, users: userShortInfo[], roomId: string) {
    const userIdList = users.map(user => user.id) // 유저 리스트
    
    if (!userIdList.includes(userId)) return
    
    // locationState 업데이트
    const locationData: { state: State, roomId: string } = { state: 'game', roomId }
    await this.redisService.stringifyAndSet(`locationState:${userId}`, locationData)

    const gameDataIndex = `game:${roomId}` // 게임방 키값 변수로 저장

    try {
      const gameData: GameInRedis = await this.redisService.getAndParse(`${gameDataIndex}`)
      let gamePlayerList: GamePlayerInRedis[] = []
      let myPlayerData: GamePlayerInRedis | undefined

      // 플레이어 데이터 수집
      for (let i = 0; i < 20; i++) {
        const gamePlayerData: GamePlayerInRedis = await this.redisService.getAndParse(`${gameDataIndex}:player:${i}`)
        if (gamePlayerData) {
          gamePlayerList.push(gamePlayerData)
          if (gamePlayerData.userId === userId) {
            myPlayerData = gamePlayerData
          }
        }
      }


      // 내 게임 데이터를 찾았을 때만 게임 진입
      if (myPlayerData) {
        const response: userDataResponse = { 
          locationState: 'game',
          playerId: myPlayerData.playerId,
          myStatus: {
            state: myPlayerData.state as any,
            items: myPlayerData.items as any,
            region: myPlayerData.regionId,
            next: myPlayerData.next,
            act: myPlayerData.act as any
          },
          gameTurn: gameData.turn,
          count: gameData.turn < 5? 60 : 90, // 카운트다운시간 5턴 전에는 1분, 5턴 이후 1분 30초
        }
        
        const gamePlayerDto: SurvivorInterface[] = gamePlayerList.map(player => ({
          playerId: player.playerId,
          sameRegion: player.regionId === myPlayerData.regionId,
          state: player.playerId === myPlayerData.playerId 
            ? 'you' 
            : player.state === 'host' 
              ? 'alive' 
              : player.state
        }));

        response.survivorList = gamePlayerDto
        
        console.log(`${roomId}방 게임 시작 - 유저 ${userId} (플레이어 ${myPlayerData.playerId})`)
        // 클라이언트에게 게임 데이터 전송
        client.emit('update', response)
        return response
      } else {
        console.warn(`유저 ${userId}의 게임 데이터를 찾을 수 없음`)
      }
    } catch (error) {
      throw new WsException(`게임 시작 처리 중 오류: ${error}`)
    }
    }
}




