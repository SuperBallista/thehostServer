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

  async verifyAndTrackConnection(client: Socket): Promise<{ userId: number }> {
    const token = client.handshake.auth?.token;
    const locationState = client.handshake.auth?.locationState || 'lobby';
    const currentRoom = client.handshake.auth?.currentRoom || '';

    if (!token) throw new Error('Missing token');

    const payload = await this.jwtService.parseAccessToken(token);

    client.data.userId = payload.userId;
    client.data.nickname = payload.nickname

    await this.redisService.set(`online:${payload.userId}`, client.id, 300);
    await this.redisService.set(`locationState:${payload.userId}`, `${locationState} ${currentRoom}`, 300);

    return { userId: payload.userId };
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.userId;
    if (userId) {
      await this.redisService.del(`online:${userId}`);
      // locationState는 자동 만료되도록 냅둬도 됨
    }
  }
}
