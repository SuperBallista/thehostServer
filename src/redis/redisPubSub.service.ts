// src/redis/redisPubSub.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Server } from 'socket.io';

@Injectable()
export class RedisPubSubService implements OnModuleInit {
  public publisher: Redis;
  public subscriber: Redis;
  public io: Server | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.publisher = new Redis({ host, port });
    this.subscriber = new Redis({ host, port });
  }

  onModuleInit() {
    this.subscriber.subscribe('room:update', (err, count) => {
      if (err) {
        console.error('❌ Redis 구독 실패:', err);
        return;
      }
      console.log(`✅ Redis PubSub: room:update 채널 구독 시작 (${count}개 구독 중)`);

      this.subscriber.on('message', (channel, message) => {
        if (channel === 'room:update') {
          try {
            const room = JSON.parse(message);
            const roomId = room.id;
            this.io?.to(roomId).emit(`room:update:${roomId}`, room);
            console.log(`📢 room:update:${roomId} → 소켓 클라이언트에게 emit`);
          } catch (e) {
            console.warn('🚨 room:update 메시지 파싱 실패:', e);
          }
        }
      });
    });
  }
}
