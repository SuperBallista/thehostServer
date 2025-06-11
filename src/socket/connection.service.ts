// connection.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '../jwt/jwt.service';
import { Socket } from 'socket.io';
import { Room } from './payload.types';

import { UserService } from 'src/user/user.service';
import { WsException } from '@nestjs/websockets';
import { moveToLobby, moveToRoom } from './utils/socketRoomManager';
import { LocationState } from './data.types';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly userService: UserService
  ) {}

async verifyAndTrackConnection(client: Socket): Promise<{ userId: number, state: string, roomId: string }> {
  const token = client.handshake.auth?.token;
  if (!token) throw new WsException('Missing token');

  const payload = await this.jwtService.parseAccessToken(token);
  client.data.userId = payload.userId;
  client.data.nickname = payload.nickname;

  await this.redisService.stringifyAndSet(`online:${payload.userId}`, {id: client.id});

  const parsed:LocationState = await this.redisService.getAndParse(`locationState:${payload.userId}`);
  let loadedState = 'lobby';
  let roomId: string = '';

  if (parsed) {
    loadedState = parsed.state || 'lobby';
    roomId = parsed.roomId || '';

    if ((loadedState === 'room' || loadedState === 'game') && roomId) {
      const roomData:Room = await this.redisService.getAndParse(`room:data:${roomId}`);
      if (roomData) {
        client.data.currentRoom = roomData.id;
        // ✅ socket.io 방에 다시 join
        moveToRoom(client, roomData.id || roomId);
      } else {
        moveToLobby(client); // fallback
      }
    } else {
      moveToLobby(client);
    }
  } else {
    moveToLobby(client);
  }

  return { userId: payload.userId, state:loadedState, roomId};
}
  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;
  
    // 유예 시간 5초 후 처리
    setTimeout(async () => {
      const isReconnected = await this.checkUserStillConnected(userId);
      if (!isReconnected) {
        // 여기서 진짜 유저 퇴장 처리
        await this.redisService.del(`online:${userId}`);
        console.log(`❌ 유저 ${userId} 완전 퇴장 처리`);
      } else {
        console.log(`✅ 유저 ${userId} 재접속 감지 → 퇴장 취소`);
      }
    }, 5000); // 5초 유예
  }

  async checkUserStillConnected(userId: number): Promise<boolean> {
    const socketId:{id:string} = await this.redisService.getAndParse(`online:${userId}`);
    return !!socketId.id;
  }
  
    
  async getLocationData(userId: number) {
    const lobby = {state:`lobby`, roomInfo: undefined, roomId: undefined}
    const raw:LocationState = await this.redisService.getAndParse(`locationState:${userId}`);
    if (!raw || !raw.roomId) return lobby
    
    let roomInfo:Room | undefined
      if (raw.state !== `lobby` && raw.roomId) {
      roomInfo = await this.redisService.getAndParse(`room:data:${raw.roomId}`);
      if (!roomInfo) await this.redisService.stringifyAndSet(`room:data:${raw.roomId}`,{state:`lobby`}) 
      }
    
    return { state: raw.state, roomInfo, roomId: raw.roomId };
      }

      async setLocation(userId: number, data: { state: string; roomId: string }) {
      let roomData:Room = await this.redisService.getAndParse(`room:data:${data.roomId}`)
      let userData = await this.userService.findById(userId)
      if (!userData.nickname) throw new WsException('서버 오류 발생: 닉네임이 없음')
      await this.redisService.stringifyAndSet(`locationState:${userId}`, data);
      if (roomData) roomData.players.push({id: userData.id, nickname:userData.nickname})
}
  
}

