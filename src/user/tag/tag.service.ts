// profile/tag/tag.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { encodeBase32 } from 'src/utils/base32';

@Injectable()
export class TagService {
  // 상수 정의
  private readonly MAX_PER_TAG = 128;

  constructor(private readonly redisService: RedisService) {}


  async generateTag(): Promise<string> {
    const redisClient = this.redisService.getClient();
    
    try {
      // 캐시된 태그 리스트 10개 가져오기
      const tags = await redisClient.lrange('nickname-tag:candidates', 0, 9);
      
      // 기존 태그 중 사용 가능한 것 찾기
      for (const tag of tags) {
        const key = `nickname-tag:${tag}`;
        let count = 0;
        
        try {
          const countStr = await redisClient.get(key);
          count = countStr ? parseInt(countStr) : 0;
        } catch (err) {
          // Redis.Nil 에러 무시 (키가 없는 경우)
          if (err.message !== 'ERR no such key') {
            throw new Error(`태그 카운트 읽기 실패: ${err.message}`);
          }
        }
        
        if (count < this.MAX_PER_TAG) {
          // 태그 사용자 수 증가
          await redisClient.incr(key);
          return tag;
        }
      }
      
      // 새 태그 생성
      const cursor = await redisClient.incr('nickname-tag:cursor');
      const tag = encodeBase32(cursor);
      
      // 태그 사용자 수 1로 시작
      await redisClient.set(`nickname-tag:${tag}`, '1');
      
      // 후보 리스트에 추가
      await redisClient.rpush('nickname-tag:candidates', tag);
      
      return tag;
    } catch (error) {
      throw new Error(`태그 생성 실패: ${error.message}`);
    }
  }
}