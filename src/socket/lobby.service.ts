// src/socket/lobby.service.ts
import { Injectable } from '@nestjs/common';
import { RedisPubSubService } from '../redis/redisPubSub.service';
import { Room, userShortInfo } from './lobby.types';
import { RedisService } from 'src/redis/redis.service';
import { encodeBase32 } from 'src/utils/base32';
import { WsException } from '@nestjs/websockets';
import { UserDto } from 'src/user/dto/user.dto';
import { UserService } from 'src/user/user.service';


@Injectable()
export class LobbyService {
  private rooms: Map<string, Room> = new Map();
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly userService: UserService,
  ) {}

  private generateRoomTag():number{
    const now = new Date();
    const timeInMs =
      now.getSeconds() * 1000 +
      now.getMilliseconds();
      return timeInMs
  }

  private async makeRoomId(name:string){
    for (let i = 0; i < 10; i++){
      const roomNameAndTag = name + '#' + encodeBase32(this.generateRoomTag())
  
      const exist = await this.redisService.exists(roomNameAndTag)
      if (!exist) {
        return roomNameAndTag
      }
    }
    throw new WsException('방 태그 생성에 실패했습니다. 잠시 후 재시도하거나 방제를 바꾸어서 재시도 해보세요')
  }

  async createRoom(hostUserId: number, name: string, hostUser: userShortInfo): Promise<Room> {
    const roomData: Room = {
      id: await this.makeRoomId(name),
      name,
      hostUserId,
      players: [hostUser],
      date: Date.now().toString()
    };
  
    // 메모리에도 저장 (옵션)
    this.rooms.set(roomData.id, roomData);
  
    // Redis 저장
    await this.redisService.set(`room:find:${roomData.id}`, JSON.stringify(roomData),3600);

    await this.redisService.set(`room:list:${roomData.date}`, roomData.id);

      
    // 위치 기록
    await this.redisService.set(`locationState:${hostUserId}`, JSON.stringify({locationState: 'host', roomId: roomData.id}), 300);
  
    // PubSub 브로드캐스트
    this.redisPubSubService.publisher.publish('room:create', JSON.stringify(roomData.id));
  
    return roomData;
  }

  async getRooms(page: number = 1): Promise<Room[]> {
  const roomListKeys = await this.getPaginatedRoomListKeys(page);
  const roomIds = await this.getRoomIdsFromKeys(roomListKeys);
    return await this.getRoomsFromIds(roomIds);
}

private async getPaginatedRoomListKeys(page: number): Promise<string[]> {
  const keys = await this.redisService.scanKeys('room:list:*');
  const sortedKeys = keys.sort().reverse();

  const pageSize = 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return sortedKeys.slice(start, end);
}

private async getRoomIdsFromKeys(keys: string[]): Promise<string[]> {
  const pipeline = this.redisService.pipeline();
  keys.forEach((key) => pipeline.get(key));
  const results = await pipeline.exec();
  if (!results) {
    throw new WsException('방 리스트에서 ID를 찾을 수 없습니다')}
  return results
    .map(([err, id]) => (err || typeof id !== 'string' ? null : id))
    .filter((id): id is string => !!id);
}

private async getRoomsFromIds(roomIds: string[]): Promise<Room[]> {
  const pipeline = this.redisService.pipeline();
  roomIds.forEach((id) => pipeline.get(`room:find:${id}`));
  const results = await pipeline.exec();
  if (!results) {
    throw new WsException('방 상세 정보를 찾을 수 없습니다')
  }  
  return results
    .map(([err, json]) => {
      if (err || typeof json !== 'string') return null;
      try {
        return JSON.parse(json) as Room;
      } catch {
        return null;
      }
    })
    .filter((room): room is Room => room !== null);
}

       async joinRoom(roomId:string, userId:number){
        // 유저 ID로 유저 정보를 불러옴
       const userData:UserDto = await this.userService.findById(userId)
       // 방 정보를 레디스에서 불러옴옴
       const roomData:Room = JSON.parse(await this.redisService.get(`room:find:${roomId}`) as string)
       // 방정보에 새로운 유저정보를 추가함
       if (!userData.nickname) throw new WsException('닉네임이 없습니다')
       roomData.players.push({id: userData.id, nickname: userData.nickname})
       // PubSub 브로드캐스트
       this.redisPubSubService.publisher.publish(`room:update`, JSON.stringify(roomData));

       await this.redisService.set(`locationState:${userId}`, JSON.stringify({locationState: 'room', roomId: roomData.id}), 300);

        return roomData
      }

      async exitToLobby(roomId:string, userId: number){
        if (!roomId) return null
        const roomData:Room = JSON.parse(await this.redisService.get(`room:find:${roomId}`) as string)

       roomData.players = roomData.players.filter(player => player.id !== userId)

       await this.redisService.set(`locationState:${userId}`, JSON.stringify({locationState: 'lobby', roomId: null}), 300);

       if (roomData.players[0].id !== roomData.hostUserId) {
        await this.redisService.del(`room:list:${roomData.date}`)
        return null
       }
       this.redisPubSubService.publisher.publish(`room:update`, JSON.stringify(roomData));

       return roomData
      }
      }
