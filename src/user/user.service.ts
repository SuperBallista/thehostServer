import { Injectable } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';
import { UserDto } from './dto/user.dto';
import { UserRepository } from './user.repository';
import { EncryptionService } from 'src/common/utils/encryption.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userCache: UserCacheService,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ✅ 1. 계정 조회
  async findUserByOAuthId(oauthId: string, provider: string): Promise<UserDto | null> {
    // Redis 캐시 확인
    const cached = await this.userCache.getUserByOAuth(provider, oauthId);
    if (cached) return cached;

    // DB 조회
    const user = await this.userRepository.findByOAuthId(provider, oauthId);
    if (user) {
      await this.userCache.setUser(Number(user.id), user);
      return user;
    }

    return null;
  }

  // ✅ 2. 계정 생성
  async createUser(
    oauthId: string,
    provider: string,
    nicknameHash: string,
    encryptedNickname: string,
    iv: string,
  ): Promise<UserDto> {
    const now = new Date();

    const insertId = await this.userRepository.insertUser({
      oauthId,
      provider,
      nicknameHash,
      encryptedNickname,
      iv,
    });

    const newUser: UserDto = {
      id: insertId,
      oAuthProvider: provider,
      oAuthId: oauthId,
      nicknameHash,
      encryptedNickname,
      ivNickname: iv,
      lastConnectedAt: now,
    };

    await this.userCache.setUser(insertId, newUser);
    return newUser;
  }


  async findById(userId: number): Promise<UserDto> {
    const cached = await this.userCache.getUser(userId);
    if (cached) return cached;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new WsException('해당 계정을 찾을 수 없습니다');
    }

    // DB에서 가져온 user에 nickname 복호화하여 추가
    if (user.encryptedNickname && user.ivNickname) {
      user.nickname = this.encryptionService.decryptNickname(
        user.encryptedNickname,
        user.ivNickname
      );
    }

    await this.userCache.setUser(userId, user);
    return user;
  }

  // user.service.ts
async cacheTemporaryUser(provider: string, oauthId: string): Promise<void> {
  const redisClient = this.userCache.getClient(); // 내부에 redisService.getClient() 래핑돼 있으면 좋음
  const key = `temp_user:${provider}:${oauthId}`;

  const data = {
    oauth_id: oauthId,
    provider,
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  await redisClient.hset(key, data);
  await redisClient.expire(key, 60 * 30); // 30분 유효
}

async getTemporaryUser(provider: string, oauthId: string): Promise<{ oauth_id: string; provider: string } | null> {
  const redisClient = this.userCache.getClient();
  const key = `temp_user:${provider}:${oauthId}`;

  const result = await redisClient.hgetall(key);
  if (!result || Object.keys(result).length === 0) {
    return null;
  }

  return {
    oauth_id: result.oauth_id,
    provider: result.provider,
  };
}
 async addNewAccount(oauthId:string, provider:string, nickname:string){
  const nickname_hash = await this.encryptionService.hashString(nickname)
  const {encrypted, iv } = await this.encryptionService.encryptNickname(nickname)
   return await this.createUser(oauthId, provider, nickname_hash,encrypted,iv)
      }

}
