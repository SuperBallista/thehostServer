// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GameInRedis, GamePlayer, GamePlayerInRedis, GameRegionInRedis, Host} from './game.types';
import { RedisService } from 'src/redis/redis.service';
import { UserService } from 'src/user/user.service';
import { WsException } from '@nestjs/websockets';
import { LocationState, userShortInfo } from '../data.types';
import { Room, State } from '../payload.types';
import { getOrderRandom } from '../utils/randomManager';
import { Socket } from 'socket.io';
import { userDataResponse } from '../payload.types';


@Injectable()
export class GameService {
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly userService: UserService,
  ) {}


  async gameStart(hostUserId: number): Promise<userDataResponse>{
    const state:LocationState = await this.redisService.getAndParse(`locationState:${hostUserId}`)
    if (!state) throw new WsException('방을 찾을 수 없습니다')   
    const roomData:Room = await this.getWaitRoomData(state.roomId)
    const gameData:userDataResponse = await this.makeGameData(roomData)
    await this.deleteWaitingRoomList(roomData.id, roomData.date)

    return gameData
}

private async getWaitRoomData(roomId){
const roomData = await this.redisService.getAndParse(`room:data:${roomId}`)
if (!roomData) throw new WsException('방정보가 없습니다')
return roomData
}

private async deleteWaitingRoomList(roomId, timeStamp){
    await this.redisService.del(`room:list:${timeStamp}`)
    await this.redisService.del(`room:data:${roomId}`)
}

private async makeGameData(roomData:Room): Promise<userDataResponse> {
    await this.redisPubSubService.publish(`internal:game:start` ,JSON.stringify(roomData)) // 모든 플레이어에게 게임 시작을 알림
    roomData.players = await this.fillBotPlayer(roomData) // 봇 채우기
    const hostPlayer = await this.selectHost(roomData.players) // 숙주 뽑기
    const shuffledPlayer = getOrderRandom(roomData.players) // 유저 섞기
    const players = await this.setPlayerInformation(shuffledPlayer, hostPlayer) // 게임 플레이어 세팅
    
    // 게임 데이터 세팅 준비 완료
    await this.createNewGameData(roomData.id, hostPlayer, players) // 게임 생성

    return {}
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
    await this.redisService.stringifyAndSet(gameDataIndex, gameData) // 게임 생성
    const newHost:Host = {hostId: hostPlayer, turn: true, infect: null}
    await this.redisService.stringifyAndSet(`${gameDataIndex}:host`,newHost) // 숙주 데이터 생성
    
    for (const player of players){
    await this.redisService.stringifyAndSet(`${gameDataIndex}:player:${player.playerId}`, player.recordData())
    } // 플레이어 데이터 생성

    await this.redisService.stringifyAndSet(`${gameDataIndex}:region:0:turn:1`, {regionId:0, turn:1, message:[]})
    await this.redisService.stringifyAndSet(`${gameDataIndex}:region:1:turn:1`, {regionId:1, turn:1, message:[]})
    await this.redisService.stringifyAndSet(`${gameDataIndex}:region:2:turn:1`, {regionId:2, turn:1, message:[]})
    await this.redisService.stringifyAndSet(`${gameDataIndex}:region:3:turn:1`, {regionId:3, turn:1, message:[]})
    await this.redisService.stringifyAndSet(`${gameDataIndex}:region:4:turn:1`, {regionId:4, turn:1, message:[]})
    await this.redisService.stringifyAndSet(`${gameDataIndex}:region:5:turn:1`, {regionId:5, turn:1, message:[]}) // 구역 데이터 생성
   
}

async subscribeGameStart(socket:Socket, userId: number, users: userShortInfo[], roomId:string){
  
  const userIdList = users.map(user => user.id) // 유저 리스트
  const locationData:{state: State, roomId: string} = {state: `game`, roomId} // 유저의 위치 정보 변경
  if (!userIdList.includes(userId)) return
  await this.redisService.stringifyAndSet(`locaionState:${userId}`, locationData)

  const gameDataIndex = `game:${roomId}` // 게임방 키값 변수로 저장

  const gameData:GameInRedis = await this.redisService.getAndParse(`${gameDataIndex}`)
  let gamePlayerList:GamePlayerInRedis[] = []
  let myPlayerData:GamePlayerInRedis
  for (let i=0; i<19; i++){
  const gamePlayerData:GamePlayerInRedis = await this.redisService.getAndParse(`${gameDataIndex}:player:${i}`)
  if (gamePlayerData) gamePlayerList.push(gamePlayerData) 
  if (gamePlayerData.userId === userId) myPlayerData = gamePlayerData
  }
  
  const gameRegionData:GameRegionInRedis = await this.redisService.getAndParse(`${gameDataIndex}:region:`)

  const response: userDataResponse = { locationState:locationData.state }
  await socket.emit(`update`, response)
  console.log(`${roomId}방 시작하기`)
}


}

