// src/redis/pubsub.types.ts

/**
 * Redis pub/sub 메시지 타입 정의
 */
export enum InternalUpdateType {
  ROOM_LIST = 'ROOM_LIST',
  ROOM_DATA = 'ROOM_DATA',
  ROOM_DELETE = 'ROOM_DELETE',
  GAME_START = 'GAME_START',
  USER_LOCATION = 'USER_LOCATION',
  PLAYER_STATUS = 'PLAYER_STATUS'
}

/**
 * 내부 pub/sub 메시지 인터페이스
 */
export interface InternalMessage {
  type: InternalUpdateType;
  data: InternalMessageData;
  targetRoomId?: string;
  targetUserId?: number;
  timestamp: number;
}

/**
 * 메시지 데이터 타입
 */
export type InternalMessageData = 
  | RoomListUpdateData
  | RoomDataUpdateData  
  | RoomDeleteData
  | GameStartData
  | UserLocationData
  | PlayerStatusData;

// 각 메시지 타입별 데이터 인터페이스
export interface RoomListUpdateData {
  roomId: string;
  action: 'create' | 'update' | 'delete';
}

export interface RoomDataUpdateData {
  roomId: string;
  roomData?: any;
}

export interface RoomDeleteData {
  roomId: string;
  kickedUserIds: number[];
}

export interface GameStartData {
  roomId: string;
  gameId: string;
  playerIds: number[];
}

export interface UserLocationData {
  userId: number;
  locationState: string;
  roomId?: string;
}

export interface PlayerStatusData {
  gameId: string;
  playerId: number;
  status: any;
}

/**
 * pub/sub 메시지 생성 헬퍼 함수들
 */
export class InternalMessageBuilder {
  
  static roomListUpdate(roomId: string, action: 'create' | 'update' | 'delete'): InternalMessage {
    return {
      type: InternalUpdateType.ROOM_LIST,
      data: { roomId, action },
      timestamp: Date.now()
    };
  }

  static roomDataUpdate(roomId: string, roomData?: any): InternalMessage {
    return {
      type: InternalUpdateType.ROOM_DATA,
      data: { roomId, roomData },
      targetRoomId: roomId,
      timestamp: Date.now()
    };
  }

  static roomDelete(roomId: string, kickedUserIds: number[]): InternalMessage {
    return {
      type: InternalUpdateType.ROOM_DELETE,
      data: { roomId, kickedUserIds },
      targetRoomId: roomId,
      timestamp: Date.now()
    };
  }

  static gameStart(roomId: string, gameId: string, playerIds: number[]): InternalMessage {
    return {
      type: InternalUpdateType.GAME_START,
      data: { roomId, gameId, playerIds },
      targetRoomId: roomId,
      timestamp: Date.now()
    };
  }

  static userLocation(userId: number, locationState: string, roomId?: string): InternalMessage {
    return {
      type: InternalUpdateType.USER_LOCATION,
      data: { userId, locationState, roomId },
      targetUserId: userId,
      timestamp: Date.now()
    };
  }

  static playerStatus(gameId: string, playerId: number, status: any): InternalMessage {
    return {
      type: InternalUpdateType.PLAYER_STATUS,
      data: { gameId, playerId, status },
      timestamp: Date.now()
    };
  }
}

/**
 * 메시지 처리 결과 타입
 */
export interface MessageProcessResult {
  success: boolean;
  type: InternalUpdateType;
  processed: boolean;
  error?: string;
}
