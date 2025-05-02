// user/user-cache.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { UserDto } from './dto/user.dto';

@Injectable()
export class UserCacheService {
  constructor(private readonly redisService: RedisService) {}

  async getUser(userId: number): Promise<UserDto | null> {
    const redisClient = this.redisService.getClient();
    const key = `user:${userId}`;
    
    const result = await redisClient.hgetall(key);
    
    if (!result || Object.keys(result).length === 0) {
      return null; // 캐시 없음
    }

    const user: UserDto = {
      id: Number(result.id),
      oAuthProvider: result.oauth_provider,
      oAuthId: result.oauth_id,
      nicknameHash: result.nickname_hash,
      encryptedNickname: result.encrypted_nickname,
      ivNickname: result.iv_nickname,
      lastConnectedAt: new Date(result.last_connected_at),
    };

    return user;
  }

  async setUser(userId: number, user: UserDto): Promise<void> {
    const redisClient = this.redisService.getClient();
    const key = `user:${userId}`;
    
    const data = {
      id: user.id,
      oauth_provider: user.oAuthProvider,
      oauth_id: user.oAuthId,
      nickname_hash: user.nicknameHash,
      encrypted_nickname: user.encryptedNickname,
      iv_nickname: user.ivNickname,
      last_connected_at: user.lastConnectedAt,
    };
    
    await redisClient.hset(key, data);
  }
}