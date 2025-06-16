import { RedisPubSubService } from "./redisPubSub.service";

/**
 * 방 업데이트 헬퍼 함수
 * 방 목록과 방 데이터를 동시에 업데이트하는 편의 함수
 */
export async function publishRoomUpdate(redisPubSubService: RedisPubSubService, roomId: string): Promise<void> {
  // 새로운 통합 구조 사용
  await redisPubSubService.publishRoomDataUpdate(roomId);
  await redisPubSubService.publishRoomListUpdate(roomId, 'update');
}
  