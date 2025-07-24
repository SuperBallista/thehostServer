// src/socket/types/pubsub-helper.ts

import {
  InternalMessage,
  InternalMessageBuilder,
  InternalUpdateType,
  InternalMessageData,
  RoomListUpdateData,
  RoomDataUpdateData,
  RoomDeleteData,
  GameStartData,
  UserLocationData,
  PlayerStatusData,
} from '../../redis/pubsub.types';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { userDataResponse } from '../payload.types';

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
  async notifyRoomDeleted(
    roomId: string,
    kickedUserIds: number[] = [],
  ): Promise<void> {
    await this.pubSubService.publishRoomDelete(roomId, kickedUserIds);
    await this.pubSubService.publishRoomListUpdate(roomId, 'delete');
  }

  /**
   * 게임 시작 알림
   */
  async notifyGameStarted(
    roomId: string,
    gameId: string,
    playerIds: number[],
  ): Promise<void> {
    await this.pubSubService.publishGameStart(roomId, gameId, playerIds);
  }

  /**
   * 사용자 위치 변경 알림
   */
  async notifyUserLocationChanged(
    userId: number,
    locationState: string,
    roomId?: string,
  ): Promise<void> {
    const message = InternalMessageBuilder.userLocation(
      userId,
      locationState,
      roomId,
    );
    await this.pubSubService.publishInternal(message);
  }

  /**
   * 플레이어 상태 변경 알림
   */
  async notifyPlayerStatusChanged(
    gameId: string,
    playerId: number,
    status: Partial<userDataResponse>,
  ): Promise<void> {
    const message = InternalMessageBuilder.playerStatus(
      gameId,
      playerId,
      status,
    );
    await this.pubSubService.publishInternal(message);
  }
}

/**
 * 메시지 검증 헬퍼
 */
export class MessageValidator {
  static validateInternalMessage(message: unknown): message is InternalMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const msg = message as Record<string, unknown>;

    return (
      typeof msg.type === 'string' &&
      Object.values(InternalUpdateType).includes(
        msg.type as InternalUpdateType,
      ) &&
      msg.data !== undefined &&
      typeof msg.timestamp === 'number'
    );
  }

  static validateMessageData(
    type: InternalUpdateType,
    data: InternalMessageData,
  ): boolean {
    switch (type) {
      case InternalUpdateType.ROOM_LIST:
        const roomListData = data as RoomListUpdateData;
        return !!roomListData.roomId && !!roomListData.action;

      case InternalUpdateType.ROOM_DATA:
        const roomData = data as RoomDataUpdateData;
        return !!roomData.roomId;

      case InternalUpdateType.ROOM_DELETE:
        const roomDeleteData = data as RoomDeleteData;
        return (
          !!roomDeleteData.roomId && Array.isArray(roomDeleteData.kickedUserIds)
        );

      case InternalUpdateType.GAME_START:
        const gameStartData = data as GameStartData;
        return (
          !!gameStartData.roomId &&
          !!gameStartData.gameId &&
          Array.isArray(gameStartData.playerIds)
        );

      case InternalUpdateType.USER_LOCATION:
        const userLocationData = data as UserLocationData;
        return !!userLocationData.userId && !!userLocationData.locationState;

      case InternalUpdateType.PLAYER_STATUS:
        const playerStatusData = data as PlayerStatusData;
        return (
          !!playerStatusData.gameId &&
          !!playerStatusData.playerId &&
          !!playerStatusData.status
        );

      default:
        return false;
    }
  }
}
