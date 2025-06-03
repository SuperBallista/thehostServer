// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, userInfo } from './game.types';
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
    const gameData = await new Game(roomData.id, roomData.hostUserId)
    const gameDataIndex = `game:${gameData.gameId}`
    await this.redisService.set(gameDataIndex, JSON.stringify(gameData))

    const shuffledPlayer = getOrderRandom(roomData.players)
    await this.selectHost(roomData.players)



    return gameData
}

private async selectHost(players:userShortInfo[]){

return players[Math.floor(Math.random() * players.length)]
}

      }
