// connection.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '../jwt/jwt.service';
import { Socket } from 'socket.io';
import { Room } from './lobby.types';
import { UserService } from 'src/user/user.service';
import { WsException } from '@nestjs/websockets';
import { moveToLobby, moveToRoom } from './utils/socketRoomManager';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly userService: UserService
  ) {}

async verifyAndTrackConnection(client: Socket): Promise<{ userId: number, state: string, roomId: any }> {
  const token = client.handshake.auth?.token;
  if (!token) throw new WsException('Missing token');

  const payload = await this.jwtService.parseAccessToken(token);
  client.data.userId = payload.userId;
  client.data.nickname = payload.nickname;

  await this.redisService.set(`online:${payload.userId}`, client.id);

  const raw = await this.redisService.get(`locationState:${payload.userId}`);
  let loadedState = 'lobby';
  let roomId = null;

  if (raw) {
    const parsed = JSON.parse(raw);
    loadedState = parsed.state || 'lobby';
    roomId = parsed.roomId || '';

    if ((loadedState === 'room' || loadedState === 'game') && roomId) {
      const roomString = await this.redisService.get(`room:data:${roomId}`);
      if (roomString) {
       const roomData:Room = JSON.parse(roomString);
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

  return { userId: payload.userId, state:loadedState, roomId };
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
    const socketId = await this.redisService.get(`online:${userId}`);
    return !!socketId;
  }
  
    
  async getLocationData(userId: number) {
    const raw = await this.redisService.get(`locationState:${userId}`);
    if (!raw) return { state: 'lobby', roomId: null };
    
    const { state, roomId } = JSON.parse(raw);
    
    let roomInfo
    if ((state === 'room' || state === 'host' || state === 'game') && roomId) {
      const roomData = await this.redisService.get(`room:data:${roomId}`);
      if (roomData && typeof roomData === 'string') {
        roomInfo = JSON.parse(roomData);
      }
    }
    
    return { state, roomInfo, roomId };
      }

      async setLocation(userId: number, data: { state: string; roomId: string }) {
      let roomData:Room = JSON.parse(await this.redisService.get(`room:data:${data.roomId}`) as string) as unknown as Room;
      let userData = await this.userService.findById(userId)
      if (!userData.nickname) throw new WsException('서버 오류 발생: 닉네임이 없음')
      await this.redisService.set(`locationState:${userId}`, JSON.stringify(data));
      if (roomData) roomData.players.push({id: userData.id, nickname:userData.nickname})
}

  
}

