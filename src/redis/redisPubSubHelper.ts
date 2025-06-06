import { RedisPubSubService } from "./redisPubSub.service";

// redisPubSubHelper.ts 또는 redisEventUtil.ts 같은 유틸 파일로 분리해도 좋음
export function publishRoomUpdate(redisPubSubService: RedisPubSubService, roomId: string) {
  
    redisPubSubService.publish('internal:room:list', roomId);
    redisPubSubService.publish(`internal:room:data`, roomId);
  }
  