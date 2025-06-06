// src/redis/redisPubSub.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { RedisService } from './redis.service';
import { WsException } from '@nestjs/websockets';
import { string } from 'joi';

@Injectable()
export class RedisPubSubService implements OnModuleInit {
  public publisher: Redis;
  public subscriber: Redis;
  public io: Server | null = null;

    private roomListUpdateCallback: (() => void) | null = null;

    registerRoomListUpdateCallback(cb: () => void) {
    this.roomListUpdateCallback = cb;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.publisher = new Redis({ host, port });
    this.subscriber = new Redis({ host, port });
  }

  onModuleInit() {


      this.subscriber.psubscribe('internal:room:delete:*', (err, count) => {
    if (err) {
      console.error('❌ room:delete 구독 실패:', err);
      return;
    }
    console.log(`✅ internal:room:delete:* 패턴 구독 시작 (${count}개 채널)`);
  });

this.subscriber.on('pmessage', async (pattern, channel, message:string) => {
  if (channel.startsWith('internal:room:delete:')) {
    const roomId = message;

    // ✅ 방에 있던 유저들에게는 "방이 사라졌음" 알림
    this.io?.to(`room:${roomId}`).emit('update:room:closed', {
      roomId,
      message: '방이 삭제되었습니다. 로비로 이동합니다.',
    });

    // ✅ 로비 유저에게는 방 목록에서 삭제하라고 알림
    this.io?.to('lobby').emit('update:room:list');

    console.log(`📢 update:room:closed → room:${roomId}`);
    console.log(`📢 update:room:list → lobby`);
  }
});


    // room:data:update 구독
  this.subscriber.subscribe('internal:room:data', (err, count) => {
  if (err) {
    console.error('❌ Redis 구독 실패:', err);
    return;
  }
  console.log(`✅ internal:room:data 채널 구독 시작 (${count}개 채널)`);

  this.subscriber.on('message', async (channel, message) => {
    // ✔ 고친 부분: internal:room:data로 비교
    if (channel === 'internal:room:data') {
      try {
        const room = await this.redisService.getAndParse(`room:data:${message}`)
        if (!room) throw new WsException('방 정보를 찾을 수 없습니다')
        const roomId = room.id;
        this.io?.to(`room:${roomId}`).emit(`update:room:data`, room); // 이벤트명도 정리
        console.log(`📢 update:room:data → room:${roomId} 클라이언트에게 emit`);
      } catch (e) {
        console.warn('🚨 메시지 파싱 실패:', e);
      }
    }

    if (channel === 'internal:room:list') {
      if (this.roomListUpdateCallback) {
        this.roomListUpdateCallback(); // ← 콜백 실행
      }
    }
  });
});

    // 추가 채널 구독
    this.subscriber.subscribe('internal:room:list');
  }

  
  // 외부에서 호출할 수 있는 publish 함수
  async publish(channel: string, payload: any) {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }
}
