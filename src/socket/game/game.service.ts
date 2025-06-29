// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GameInRedis, GamePlayer, GamePlayerInRedis, Host} from './game.types';
import { RedisService } from 'src/redis/redis.service';
import { WsException } from '@nestjs/websockets';
import { LocationState, userShortInfo } from '../data.types';
import { PlayerState, Room, State, SurvivorInterface } from '../payload.types';
import { getOrderRandom } from '../utils/randomManager';
import { userDataResponse } from '../payload.types';
import { GameTurnService } from './gameTurn.service';


@Injectable()
export class GameService {
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly gameTurnService: GameTurnService,
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
    
    // 첫 턴 아이템 지급 (게임 생성 직후, 플레이어들에게 알림 전에 실행)
    await this.gameTurnService.onTurnStart(roomData.id, 1);

    // ✅ 모든 플레이어에게 게임 시작 알림 (방 데이터 삭제 전에 실행)
    const playerIds = roomData.players.map(p => p.id);
    await this.redisPubSubService.publishGameStart(roomData.id, roomData.id, playerIds);
    
    // PubSub 이벤트 처리를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 100));

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
    // 1. 유저 검증
    if (!this.isUserInRoom(userId, users)) return;
    
    // 2. 위치 상태 업데이트
    await this.updateLocationState(userId, roomId);

    try {
      // 3. 게임 데이터 로드
      const gameData = await this.getGameData(roomId);
      
      // 4. 플레이어 데이터 로드
      const playerDataResult = await this.loadAllPlayersWithRetry(roomId, userId);
      
      if (!playerDataResult.myPlayerData) {
        throw new WsException(`게임 데이터를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.`);
      }

      // 5. 응답 생성 및 전송
      const response = this.createGameStartResponse(
        gameData,
        playerDataResult.myPlayerData,
        playerDataResult.allPlayers
      );
      
      console.log(`${roomId}방 게임 시작 - 유저 ${userId} (플레이어 ${playerDataResult.myPlayerData.playerId})`);
      client.emit('update', response);
      console.log(response)
      return response;
      
    } catch (error) {
      throw new WsException(`게임 시작 처리 중 오류: ${error}`);
    }
  }

  // === Private Helper Methods ===
  
  private isUserInRoom(userId: number, users: userShortInfo[]): boolean {
    return users.some(user => user.id === userId);
  }

  private async updateLocationState(userId: number, roomId: string): Promise<void> {
    const locationData: { state: State, roomId: string } = { state: 'game', roomId };
    await this.redisService.stringifyAndSet(`locationState:${userId}`, locationData);
  }

  private async getGameData(roomId: string): Promise<GameInRedis> {
    const gameData = await this.redisService.getAndParse(`game:${roomId}`);
    if (!gameData) throw new WsException('게임 데이터를 찾을 수 없습니다');
    return gameData;
  }

  private async loadAllPlayersWithRetry(
    roomId: string, 
    userId: number
  ): Promise<{ myPlayerData: GamePlayerInRedis | undefined, allPlayers: GamePlayerInRedis[] }> {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 500;
    const MAX_PLAYERS = 20;
    
    let myPlayerData: GamePlayerInRedis | undefined;
    const playerMap = new Map<number, GamePlayerInRedis>();
    
    for (let retry = 0; retry < MAX_RETRIES && !myPlayerData; retry++) {
      if (retry > 0) {
        console.log(`유저 ${userId}의 데이터를 찾는 중... 재시도 ${retry}/${MAX_RETRIES}`);
        await this.delay(RETRY_DELAY_MS);
      }
      
      // 플레이어 데이터 수집
      for (let i = 0; i < MAX_PLAYERS; i++) {
        const playerData = await this.getPlayerData(roomId, i);
        if (playerData) {
          playerMap.set(playerData.playerId, playerData);
          if (playerData.userId === userId) {
            myPlayerData = playerData;
          }
        }
      }
    }
    
    return {
      myPlayerData,
      allPlayers: Array.from(playerMap.values())
    };
  }

  private async getPlayerData(roomId: string, playerId: number): Promise<GamePlayerInRedis | null> {
    return await this.redisService.getAndParse(`game:${roomId}:player:${playerId}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createGameStartResponse(
    gameData: GameInRedis,
    myPlayerData: GamePlayerInRedis,
    allPlayers: GamePlayerInRedis[]
  ): userDataResponse {
    return {
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
      count: this.getTurnDuration(gameData.turn),
      survivorList: this.createSurvivorList(allPlayers, myPlayerData)
    };
  }

  private getTurnDuration(turn: number): number {
    return turn < 5 ? 60 : 90;
  }

  private createSurvivorList(
    allPlayers: GamePlayerInRedis[], 
    myPlayerData: GamePlayerInRedis
  ): SurvivorInterface[] {
    return allPlayers.map(player => ({
      playerId: player.playerId,
      sameRegion: player.regionId === myPlayerData.regionId,
      state: this.getPlayerDisplayState(player, myPlayerData)
    }));
  }

  private getPlayerDisplayState(
    player: GamePlayerInRedis, 
    myPlayerData: GamePlayerInRedis
  ): PlayerState {
    if (player.playerId === myPlayerData.playerId) return 'you';
    if (player.state === 'host') return 'alive';
    return player.state;
  }
}




