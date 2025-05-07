// src/socket/lobby.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { redisPublisher } from '../redis/redis.pubsub';
import { Room, userShortInfo } from './lobby.types';
import { RedisService } from 'src/redis/redis.service';
import { encodeBase32 } from 'src/utils/base32';


@Injectable()
export class LobbyService {
  private rooms: Map<string, Room> = new Map();
  constructor(
    private readonly redisService: RedisService
  ) {}

  private generateRoomTag():number{
    const now = new Date();
    const timeInMs =
      now.getSeconds() * 1000 +
      now.getMilliseconds();
      return timeInMs
  }

  private async makeRoomId(name:string){
    for (let i = 0; i < 10; i++){
      const roomNameAndTag = name + '#' + encodeBase32(this.generateRoomTag())
  
      const exist = await this.redisService.exists(roomNameAndTag)
      if (!exist) {
        return roomNameAndTag
      }
    }
    throw new HttpException('방 태그 생성에 실패했습니다. 잠시 후 재시도하거나 방제를 바꾸어서 재시도 해보세요', HttpStatus.CONFLICT)
  }

  async createRoom(hostUserId: number, name: string, hostUser: userShortInfo): Promise<Room> {
    const roomData: Room = {
      id: await this.makeRoomId(name),
      name,
      hostUserId,
      players: [hostUser],
    };
  
    // 메모리에도 저장 (옵션)
    this.rooms.set(roomData.id, roomData);
  
    // Redis 저장
    await this.redisService.set(`room:find:${roomData.id}`, JSON.stringify(roomData));

    await this.redisService.set(`room:list:${Date.now()}`, roomData.id);

      
    // 위치 기록
    await this.redisService.set(`locationState:${hostUserId}`, JSON.stringify({locationState: 'host', roomId: roomData.id}), 300);
  
    // PubSub 브로드캐스트
    redisPublisher.publish('room:create', JSON.stringify(roomData.id));
  
    return roomData;
  }
  
  async getRooms(page: number = 1): Promise<Room[]> {
    const keys = await this.redisService.scanKeys('room:list:*');
  
    // 최신순 정렬
    const sortedKeys = keys.sort().reverse();
  
    // 페이지네이션 계산 (10개 단위)
    const pageSize = 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedKeys = sortedKeys.slice(start, end);
  
    // 각 키에서 roomId 추출 후 room:find:{id} 불러오기
    const pipeline = this.redisService.pipeline();
    pagedKeys.forEach((key) => pipeline.get(key)); // room:list:{ts} → roomId
    const roomIdResults = await pipeline.exec();

    if (!roomIdResults) return []
  
    // roomId → room:find:{id}로 다시 가져오기
    const roomIds = roomIdResults
      .map(([err, id]) => (err || typeof id !== 'string' ? null : id))
      .filter((id): id is string => !!id);
  
    const roomPipeline = this.redisService.pipeline();
    roomIds.forEach((id) => roomPipeline.get(`room:find:${id}`));
    const roomResults = (await roomPipeline.exec()) || [];
  
    return roomResults
      .map(([err, json]) => {
        if (err || typeof json !== 'string') return null;
        try {
          return JSON.parse(json) as Room;
        } catch {
          return null;
        }
      })
      .filter((room): room is Room => room !== null);
  }
    
      }
