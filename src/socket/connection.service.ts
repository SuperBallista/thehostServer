// connection.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '../jwt/jwt.service';
import { Socket } from 'socket.io';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async verifyAndTrackConnection(client: Socket): Promise<{ userId: number, state: string, roomInfo: any }> {
    const token = client.handshake.auth?.token;
    if (!token) throw new Error('Missing token');
  
    const payload = await this.jwtService.parseAccessToken(token);
    client.data.userId = payload.userId;
    client.data.nickname = payload.nickname;
  
    await this.redisService.set(`online:${payload.userId}`, client.id);
  
    // 기존 locationState를 Redis에서 가져옴
    const raw = await this.redisService.get(`locationState:${payload.userId}`);
    let state = 'lobby';
    let roomInfo = null;
  
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed.state || 'lobby';
      const roomId = parsed.roomId || '';
  
      if ((state === 'room' || state === 'game') && roomId) {
        const roomData = await this.redisService.get(`room:${roomId}`);
        if (roomData) {
          roomInfo = JSON.parse(roomData);
          client.data.currentRoom = roomId;
        }
      }
    }
  
    return { userId: payload.userId, state, roomInfo };
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
    const socketId = await this.redisService.get(`user-socket:${userId}`);
    return !!socketId;
  }
  
    
  async getLocationData(userId: number) {
    const raw = await this.redisService.get(`locationState:${userId}`);
    if (!raw) return { state: 'lobby', roomInfo: null };
    
    const { state, roomId } = JSON.parse(raw);
    
    let roomInfo = null;
    if ((state === 'room' || state === 'game') && roomId) {
      const roomData = await this.redisService.get(`room:${roomId}`);
      if (roomData && typeof roomData === 'string') {
        roomInfo = JSON.parse(roomData);
      }
    }
    
    return { state, roomInfo };
      }
  
}

