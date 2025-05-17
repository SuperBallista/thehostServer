// connection.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '../jwt/jwt.service';
import { Socket } from 'socket.io';
import { Room } from './lobby.types';
import { UserService } from 'src/user/user.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly userService: UserService
  ) {}

  async verifyAndTrackConnection(client: Socket): Promise<{ userId: number, locationState: string, roomId: any }> {
    const token = client.handshake.auth?.token;
    if (!token) throw new WsException('Missing token');
  
    const payload = await this.jwtService.parseAccessToken(token);
    client.data.userId = payload.userId;
    client.data.nickname = payload.nickname;
  
    await this.redisService.set(`online:${payload.userId}`, client.id);
  
    // 기존 locationState를 Redis에서 가져옴
    const raw = await this.redisService.get(`locationState:${payload.userId}`);
    let locationState = 'lobby';
    let roomId = null;
  
    if (raw) {
      const parsed = JSON.parse(raw);
      locationState = parsed.locationState || 'lobby';
      roomId = parsed.roomId || '';
  
      if ((locationState === 'room' || locationState === 'game') && roomId) {
        const roomData = await this.redisService.get(`room:${roomId}`);
        if (roomData) {
          roomId = JSON.parse(roomData);
          client.data.currentRoom = roomId;
        }
      }
    }
  
    return { userId: payload.userId, locationState, roomId };
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
    if (!raw) return { locationState: 'lobby', roomId: null };
    
    const { locationState, roomId } = JSON.parse(raw);
    
    let roomInfo
    if ((locationState === 'room' || locationState === 'host' || locationState === 'game') && roomId) {
      const roomData = await this.redisService.get(`room:find:${roomId}`);
      if (roomData && typeof roomData === 'string') {
        roomInfo = JSON.parse(roomData);
      }
    }
    
    return { locationState, roomInfo, roomId };
      }

      async setLocation(userId: number, data: { state: string; roomId: string }) {
      let roomData:Room = JSON.parse(await this.redisService.get(`room:find:${data.roomId}`) as string) as unknown as Room;
      let userData = await this.userService.findById(userId)
      if (!userData.nickname) throw new WsException('서버 오류 발생: 닉네임이 없음')
      await this.redisService.set(`locationState:${userId}`, JSON.stringify(data));
      roomData.players.push({id: userData.id, nickname:userData.nickname})
}

  
}

