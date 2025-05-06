// redis/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;


  onModuleInit() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  getClient(): Redis {
    return this.redisClient;
  }

  /** ✅ 단일 키 저장 (기본 5분 TTL 적용 예시) */
  async set(key: string, value: string, expireSeconds = 300): Promise<'OK'> {
    return await this.redisClient.set(key, value, 'EX', expireSeconds);
  }

  /** ✅ 단일 키 조회 */
  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  /** ✅ 단일 키 삭제 */
  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }

  /** ✅ 해시 저장 */
  async hset(key: string, data: Record<string, string | number>): Promise<number> {
    return await this.redisClient.hset(key, data);
  }

  /** ✅ 해시 가져오기 */
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.redisClient.hgetall(key);
  }

  /** ✅ 키 존재 여부 확인 */
  async exists(key: string): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1;
  }

  async scanKeys(pattern: string): Promise<string[]> {
    const stream = this.redisClient.scanStream({ match: pattern });
    const keys: string[] = [];
  
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => keys.push(...chunk));
      stream.on('end', () => resolve(keys));
      stream.on('error', (err) => reject(err));
    });
  }

  async sadd(key: string, value: string): Promise<number>{
    return this.redisClient.sadd(key,value)
  }
async smembers(key: string): Promise<string[]> {
    return this.redisClient.smembers(key)
}
pipeline() {
  return this.redisClient.pipeline();
}
}
