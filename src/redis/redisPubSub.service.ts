// src/redis/redisPubSub.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { RedisService } from './redis.service';
import { WsException } from '@nestjs/websockets';
import { Room } from 'src/socket/payload.types';
import { 
  InternalMessage, 
  InternalUpdateType, 
  InternalMessageBuilder,
  MessageProcessResult
} from './pubsub.types';

@Injectable()
export class RedisPubSubService implements OnModuleInit {
  public publisher: Redis;
  public subscriber: Redis;
  public io: Server | null = null;

  // 콜백 함수들
  private roomListUpdateCallback: (() => void) | null = null;
  private gameStartCallback: ((roomData: Room) => void) | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.publisher = new Redis({ host, port });
    this.subscriber = new Redis({ host, port });
  }

  registerRoomListUpdateCallback(cb: () => void) {
    this.roomListUpdateCallback = cb;
  }

  registerGameStartCallback(cb: (roomData: Room) => void) {
    this.gameStartCallback = cb;
  }

  onModuleInit() {
    // 단일 internal 채널 구독
    this.subscriber.subscribe('internal', (err, count) => {
      if (err) {
        console.error('❌ Redis internal 채널 구독 실패:', err);
        return;
      }
      console.log(`✅ internal 채널 구독 시작 (${count}개 채널)`);

      this.subscriber.on('message', async (channel, message) => {
        if (channel === 'internal') {
          await this.processInternalMessage(message);
        }
      });
    });
  }

  /**
   * 내부 메시지 처리
   */
  private async processInternalMessage(messageStr: string): Promise<MessageProcessResult> {
    try {
      const message: InternalMessage = JSON.parse(messageStr);
      
      console.log(`📢 Internal Message: ${message.type}`, {
        type: message.type,
        targetRoom: message.targetRoomId,
        targetUser: message.targetUserId
      });

      let processed = false;

      switch (message.type) {
        case InternalUpdateType.ROOM_LIST:
          processed = await this.handleRoomListUpdate(message);
          break;

        case InternalUpdateType.ROOM_DATA:
          processed = await this.handleRoomDataUpdate(message);
          break;

        case InternalUpdateType.ROOM_DELETE:
          processed = await this.handleRoomDelete(message);
          break;

        case InternalUpdateType.GAME_START:
          processed = await this.handleGameStart(message);
          break;

        case InternalUpdateType.USER_LOCATION:
          processed = await this.handleUserLocation(message);
          break;

        case InternalUpdateType.PLAYER_STATUS:
          processed = await this.handlePlayerStatus(message);
          break;

        default:
          console.warn(`🚨 처리되지 않은 메시지 타입: ${message.type}`);
      }

      return {
        success: true,
        type: message.type,
        processed
      };
      
    } catch (error) {
      console.error('🚨 내부 메시지 처리 실패:', error);
      return {
        success: false,
        type: InternalUpdateType.ROOM_LIST, // 기본값
        processed: false,
        error: error.message
      };
    }
  }

  /**
   * 방 목록 업데이트 처리
   */
  private async handleRoomListUpdate(message: InternalMessage): Promise<boolean> {
    if (this.roomListUpdateCallback) {
      this.roomListUpdateCallback();
      return true;
    }
    return false;
  }

  /**
   * 방 데이터 업데이트 처리
   */
  private async handleRoomDataUpdate(message: InternalMessage): Promise<boolean> {
    const { roomId } = message.data as any;
    
    try {
      const room = await this.redisService.getAndParse(`room:data:${roomId}`);
      if (room) {
        this.io?.to(`room:${room.id}`).emit('update', { roomData: room });
        console.log(`📢 방 데이터 업데이트 → room:${room.id}`);
        return true;
      }
    } catch (error) {
      console.error(`방 데이터 업데이트 실패: ${roomId}`, error);
    }
    return false;
  }

  /**
   * 방 삭제 처리
   */
  private async handleRoomDelete(message: InternalMessage): Promise<boolean> {
    const { roomId, kickedUserIds } = message.data as any;

    // 로비 유저에게 방 목록 업데이트 알림
    if (this.roomListUpdateCallback) {
      this.roomListUpdateCallback();
    }

    console.log(`📢 방 삭제 알림 → room:${roomId}`);
    return true;
  }

  /**
   * 게임 시작 처리
   */
  private async handleGameStart(message: InternalMessage): Promise<boolean> {
    const { roomId, gameId, playerIds } = message.data as any;
    
    console.log(`🎮 handleGameStart 호출됨 - roomId: ${roomId}, playerIds: ${playerIds}`);
    
    try {
      const roomData = await this.redisService.getAndParse(`room:data:${roomId}`);
      console.log(`🔍 Redis에서 방 데이터 조회 결과:`, roomData ? '찾음' : '없음');
      
      if (roomData && this.gameStartCallback) {
        this.gameStartCallback(roomData);
        console.log(`📢 게임 시작 알림 성공: ${roomId}`);
        return true;
      } else if (!roomData) {
        console.error(`❌ 방 데이터를 찾을 수 없음: room:data:${roomId}`);
      } else if (!this.gameStartCallback) {
        console.error(`❌ gameStartCallback이 등록되지 않음`);
      }
    } catch (error) {
      console.error(`게임 시작 처리 실패: ${roomId}`, error);
    }
    return false;
  }

  /**
   * 유저 위치 업데이트 처리
   */
  private async handleUserLocation(message: InternalMessage): Promise<boolean> {
    const { userId, locationState, roomId } = message.data as any;
    
    // 특정 유저에게만 위치 업데이트 전송
    if (message.targetUserId) {
      // 특정 유저의 소켓 ID를 찾아서 전송하는 로직 필요
      console.log(`📍 유저 위치 업데이트: ${userId} → ${locationState}`);
    }
    
    return true;
  }

  /**
   * 플레이어 상태 업데이트 처리
   */
  private async handlePlayerStatus(message: InternalMessage): Promise<boolean> {
    const { gameId, playerId, status } = message.data as any;
    
    this.io?.to(`game:${gameId}`).emit('update', {
      playerId,
      myStatus: status
    });
    
    console.log(`🎮 플레이어 상태 업데이트: ${gameId}:${playerId}`);
    return true;
  }

  /**
   * 메시지 발행 (통합된 방식)
   */
  async publishInternal(message: InternalMessage): Promise<void> {
    const messageStr = JSON.stringify(message);
    await this.publisher.publish('internal', messageStr);
  }

  /**
   * 편의 메서드들 - 기존 호환성 유지
   */
  async publishRoomListUpdate(roomId: string, action: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
    const message = InternalMessageBuilder.roomListUpdate(roomId, action);
    await this.publishInternal(message);
  }

  async publishRoomDataUpdate(roomId: string): Promise<void> {
    const message = InternalMessageBuilder.roomDataUpdate(roomId);
    await this.publishInternal(message);
  }

  async publishRoomDelete(roomId: string, kickedUserIds: number[] = []): Promise<void> {
    const message = InternalMessageBuilder.roomDelete(roomId, kickedUserIds);
    await this.publishInternal(message);
  }

  async publishGameStart(roomId: string, gameId: string, playerIds: number[]): Promise<void> {
    const message = InternalMessageBuilder.gameStart(roomId, gameId, playerIds);
    await this.publishInternal(message);
  }

  /**
   * 기존 호환성 유지를 위한 레거시 메서드
   */
  async publish(channel: string, payload: any): Promise<void> {
    console.warn('⚠️ Legacy publish method used. Consider using publishInternal instead.');
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await this.publisher.publish(channel, data);
  }
}
