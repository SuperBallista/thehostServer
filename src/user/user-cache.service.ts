// user/user-cache.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { UserDto } from './dto/user.dto';
import { EncryptionService } from 'src/common/utils/encryption.service';

@Injectable()
export class UserCacheService {
  constructor(private readonly redisService: RedisService,
              private readonly encryptionService: EncryptionService
  ) {}

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
      nickname: result.nickname,
      lastConnectedAt: new Date(result.last_connected_at),
    };

    return user;
  }

  async setUser(userId: number, user: UserDto): Promise<void> {
    const redisClient = this.redisService.getClient();
    const key = `user:${userId}`;
    let nickname

    if (!user.encryptedNickname||!user.ivNickname) {
     nickname = user.nickname
    } else {
     nickname = this.encryptionService.decryptNickname(user.encryptedNickname, user.ivNickname)
    }

  
    const data = {
      id: user.id.toString(),
      oauth_provider: user.oAuthProvider,
      oauth_id: user.oAuthId,
      nickname,
      last_connected_at: user.lastConnectedAt.toISOString(),
    };
  
    await redisClient.hset(key, data);
    await redisClient.expire(key, 60 * 60 * 3); // ⏰ 3시간 TTL
  
    await redisClient.set(
      `user_oauth:${user.oAuthProvider}:${user.oAuthId}`,
      user.id.toString(),
      'EX',
      60 * 60 * 3,
    );
  }
  
  async getUserByOAuth(provider: string, oauthId: string): Promise<UserDto | null> {
    const redisClient = this.redisService.getClient();
    const oauthKey = `user_oauth:${provider}:${oauthId}`;
  
    const userIdStr = await redisClient.get(oauthKey);
    if (!userIdStr) return null;
  
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;
  
    return this.getUser(userId);
  }
  
   getClient(){
    return this.redisService.getClient();
  }

  async findTempUser(provider: string, oauthId: string): Promise<{ oauthId: string; provider: string;} | null> {
    const redisClient = this.redisService.getClient();
    const key = `temp_user:${provider}:${oauthId}`;
  
    const result = await redisClient.hgetall(key);
  
    if (!result || Object.keys(result).length === 0) {
      return null;
    }
  
    return {
      oauthId: result.oauth_id,
      provider: result.provider,
    };
  }
  
}