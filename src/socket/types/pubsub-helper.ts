// src/socket/types/pubsub-helper.ts

import { InternalMessage, InternalMessageBuilder, InternalUpdateType } from '../../redis/pubsub.types';
import { RedisPubSubService } from '../../redis/redisPubSub.service';

/**
 * pub/sub 메시지 발행 헬퍼 클래스
 * 각 서비스에서 쉽게 사용할 수 있도록 래핑
 */
export class PubSubHelper {
  constructor(private readonly pubSubService: RedisPubSubService) {}

  /**
   * 방 생성 알림
   */
  async notifyRoomCreated(roomId: string): Promise<void> {
    await this.pubSubService.publishRoomListUpdate(roomId, 'create');
  }

  /**
   * 방 업데이트 알림  
   */
  async notifyRoomUpdated(roomId: string): Promise<void> {
    await this.pubSubService.publishRoomDataUpdate(roomId);
    await this.pubSubService.publishRoomListUpdate(roomId, 'update');
  }

  /**
   * 방 삭제 알림
   */
  async notifyRoomDeleted(roomId: string, kickedUserIds: number[] = []): Promise<void> {
    await this.pubSubService.publishRoomDelete(roomId, kickedUserIds);
    await this.pubSubService.publishRoomListUpdate(roomId, 'delete');
  }

  /**
   * 게임 시작 알림
   */
  async notifyGameStarted(roomId: string, gameId: string, playerIds: number[]): Promise<void> {
    await this.pubSubService.publishGameStart(roomId, gameId, playerIds);
  }

  /**
   * 사용자 위치 변경 알림
   */
  async notifyUserLocationChanged(userId: number, locationState: string, roomId?: string): Promise<void> {
    const message = InternalMessageBuilder.userLocation(userId, locationState, roomId);
    await this.pubSubService.publishInternal(message);
  }

  /**
   * 플레이어 상태 변경 알림
   */
  async notifyPlayerStatusChanged(gameId: string, playerId: number, status: any): Promise<void> {
    const message = InternalMessageBuilder.playerStatus(gameId, playerId, status);
    await this.pubSubService.publishInternal(message);
  }
}

/**
 * 메시지 검증 헬퍼
 */
export class MessageValidator {
  
  static validateInternalMessage(message: any): message is InternalMessage {
    return (
      message &&
      typeof message.type === 'string' &&
      Object.values(InternalUpdateType).includes(message.type) &&
      message.data &&
      typeof message.timestamp === 'number'
    );
  }

  static validateMessageData(type: InternalUpdateType, data: any): boolean {
    switch (type) {
      case InternalUpdateType.ROOM_LIST:
        return data.roomId && data.action;
      
      case InternalUpdateType.ROOM_DATA:
        return data.roomId;
      
      case InternalUpdateType.ROOM_DELETE:
        return data.roomId && Array.isArray(data.kickedUserIds);
      
      case InternalUpdateType.GAME_START:
        return data.roomId && data.gameId && Array.isArray(data.playerIds);
      
      case InternalUpdateType.USER_LOCATION:
        return data.userId && data.locationState;
      
      case InternalUpdateType.PLAYER_STATUS:
        return data.gameId && data.playerId && data.status;
      
      default:
        return false;
    }
  }
}
