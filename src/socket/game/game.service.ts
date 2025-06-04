// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GamePlayer, Host} from './game.types';
import { RedisService } from 'src/redis/redis.service';
import { UserService } from 'src/user/user.service';
import { WsException } from '@nestjs/websockets';
import { Room, userShortInfo } from '../lobby.types';
import { getOrderRandom } from '../utils/randomManager';


@Injectable()
export class GameService {
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly userService: UserService,
  ) {}


  async gameStart(hostUserId: number){
    const roomId = await this.redisService.get(`locationState:${hostUserId}`)
    if (!roomId) throw new WsException('방을 찾을 수 없습니다')   
    const roomData:Room = await this.getWaitRoomData(roomId)
    const gameData = await this.makeGameData(roomData)
    await this.deleteWaitingRoomList(roomId, roomData.date)


}

private async getWaitRoomData(roomId){
const roomData = await this.redisService.get(`room:data:${roomId}`)
if (!roomData) throw new WsException('방정보가 없습니다')
return JSON.parse(roomData)
}

private async deleteWaitingRoomList(roomId, timeStamp){
    await this.redisService.del(`room:list:${timeStamp}`)
    await this.redisService.del(`room:data:${roomId}`)
}

private async makeGameData(roomData:Room){
    await this.redisPubSubService.publish(`internal:game:start` ,roomData) // 모든 플레이어에게 게임 시작을 알림
    roomData.players = await this.fillBotPlayer(roomData) // 봇 채우기
    const hostPlayer = await this.selectHost(roomData.players) // 숙주 뽑기
    const shuffledPlayer = getOrderRandom(roomData.players) // 유저 섞기
    const players = await this.setPlayerInformation(shuffledPlayer, hostPlayer) // 게임 플레이어 세팅
    
    // 게임 데이터 세팅 준비 완료
    await this.createNewGameData(roomData.id, hostPlayer, players) // 게임 생성

}

private async selectHost(players:userShortInfo[]){
 return Math.floor(Math.random() * players.length)
}

private async fillBotPlayer(roomData:Room){
if (roomData.bot){
  let i = 1
  while (roomData.players.length < 20){
  roomData.players.push( {nickname: `botPlayer${i}`, id: i*-1 } )
  i++
  }
}
return roomData.players
}

private setPlayerInformation(players:userShortInfo[], hostPlayer: number){
  let regionNumber = 6
  if (players.length < 10){
    regionNumber = 3
  } else if (players.length < 14) {
    regionNumber = 4
  } else if (players.length < 18) {
    regionNumber = 5
  } // 인원별로 구역 갯수 설정

  const gamePlayers = players.map((player, index) => new GamePlayer(index, player.id, Math.floor(Math.random() * 6), index === hostPlayer, regionNumber)) // 게임플레이어 객체 세팅

  return gamePlayers
}


private async createNewGameData(gameId:string, hostPlayer:number, players: GamePlayer[]){
    const gameData = await new Game(gameId, hostPlayer) // 게임 데이터 객체 생성
    const gameDataIndex = `game:${gameData.gameId}` // 게임방 키값 변수로 저장
    await this.redisService.set(gameDataIndex, JSON.stringify(gameData)) // 게임 생성
    const newHost:Host = {hostId: hostPlayer, turn: true, infect: null}
    await this.redisService.set(`${gameDataIndex}:host`,JSON.stringify(newHost)) // 숙주 데이터 생성
    
    for (const player of players){
    await this.redisService.set(`${gameDataIndex}:player:${player.playerId}`, JSON.stringify(player))
    } // 플레이어 데이터 생성

    await this.redisService.set(`${gameDataIndex}:region:0:turn:1`, JSON.stringify({regionId:0, turn:1, message:[]}))
    await this.redisService.set(`${gameDataIndex}:region:1:turn:1`, JSON.stringify({regionId:1, turn:1, message:[]}))
    await this.redisService.set(`${gameDataIndex}:region:2:turn:1`, JSON.stringify({regionId:2, turn:1, message:[]}))
    await this.redisService.set(`${gameDataIndex}:region:3:turn:1`, JSON.stringify({regionId:3, turn:1, message:[]}))
    await this.redisService.set(`${gameDataIndex}:region:4:turn:1`, JSON.stringify({regionId:4, turn:1, message:[]}))
    await this.redisService.set(`${gameDataIndex}:region:5:turn:1`, JSON.stringify({regionId:5, turn:1, message:[]})) // 구역 데이터 생성
   
}

async subscribeGameStart(userId: number, players: userShortInfo[], roomId:string){
  const playerIdList = players.map(item => item.id)
  const locationData = {userId, locationState: `game`, roomId}
  if (!playerIdList.includes(userId)) return
  await this.redisService.set(`locaionState:${userId}`, JSON.stringify(locationData))
}


}

