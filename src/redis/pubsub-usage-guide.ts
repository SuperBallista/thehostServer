// Redis pub/sub 통합 구조 사용 예제

/*
=======================================
Redis pub/sub 통합 구조 변경 완료!
=======================================

## 변경 사항

### 1. 기존 구조 (분산된 채널)
```
internal:room:list        -> 방 목록 업데이트
internal:room:data        -> 방 데이터 업데이트  
internal:game:start       -> 게임 시작
internal:room:delete:*    -> 방 삭제 (패턴)
```

### 2. 새로운 구조 (통합 채널)
```
internal                  -> 모든 메시지 통합
```

메시지 구조:
```typescript
{
  type: InternalUpdateType,  // ENUM으로 타입 관리
  data: InternalMessageData, // 실제 데이터
  targetRoomId?: string,     // 타겟 방 ID
  targetUserId?: number,     // 타겟 유저 ID  
  timestamp: number          // 타임스탬프
}
```

## 사용 방법

### 서버 사이드 (NestJS)

```typescript
// 1. 기본 사용법
await this.redisPubSubService.publishRoomListUpdate(roomId, 'create');
await this.redisPubSubService.publishRoomDataUpdate(roomId);
await this.redisPubSubService.publishGameStart(roomId, gameId, playerIds);

// 2. 헬퍼 클래스 사용
const helper = new PubSubHelper(this.redisPubSubService);
await helper.notifyRoomCreated(roomId);
await helper.notifyRoomUpdated(roomId);
await helper.notifyGameStarted(roomId, gameId, playerIds);

// 3. 직접 메시지 생성
const message = InternalMessageBuilder.roomListUpdate(roomId, 'create');
await this.redisPubSubService.publishInternal(message);
```

### 클라이언트 사이드 (Svelte)

클라이언트는 기존과 동일하게 `update` 이벤트로 처리:
```typescript
socket.on('update', (data) => {
  // 서버에서 처리된 결과를 받음
  if (data.roomData) currentRoom.set(data.roomData);
  if (data.locationState) locationState.set(data.locationState);
});
```

## 장점

✅ **타입 안전성**: ENUM으로 메시지 타입 관리
✅ **확장성**: 새로운 메시지 타입 쉽게 추가
✅ **디버깅**: 통합된 로그로 추적 용이
✅ **성능**: 단일 채널로 연결 수 감소
✅ **유지보수**: 일관된 메시지 구조

## 메시지 타입

```typescript
enum InternalUpdateType {
  ROOM_LIST = 'ROOM_LIST',        // 방 목록 업데이트
  ROOM_DATA = 'ROOM_DATA',        // 방 데이터 업데이트
  ROOM_DELETE = 'ROOM_DELETE',    // 방 삭제
  GAME_START = 'GAME_START',      // 게임 시작
  USER_LOCATION = 'USER_LOCATION',// 유저 위치 변경
  PLAYER_STATUS = 'PLAYER_STATUS' // 플레이어 상태 변경
}
```

## 호환성

기존 코드와의 호환성을 위해 레거시 메서드들이 유지됩니다:
- `publish()` - 경고와 함께 사용 가능
- 기존 이벤트 처리 - 그대로 작동

## 디버깅

```typescript
// 메시지 검증
if (MessageValidator.validateInternalMessage(message)) {
  // 처리
}

// 로깅
MessageDebugger.logMessage(message, '🔍');
```

이제 Redis pub/sub이 체계적이고 확장 가능한 구조로 통일되었습니다!
*/

export {};
