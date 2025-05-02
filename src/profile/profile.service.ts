// profile/profile.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.provider';
import { RedisService } from '../redis/redis.service';
import { TagService } from './tag/tag.service';
import { EncryptionService } from '../common/utils/encryption.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly tagService: TagService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async setNickname(userId: number, nickname: string): Promise<{ nickname: string; tag: string }> {
    if (!nickname) {
      throw new BadRequestException('Nickname must not be empty');
    }

    try {
      // 1. 태그 생성 (최대 128명 제한, 10개 캐시 검사)
      const tagStr = await this.tagService.generateTag();

      const fullNickname = `${nickname}#${tagStr}`;
      const nicknameHash = this.encryptionService.hashString(nickname);
      const { encrypted, iv } = await this.encryptionService.encryptNickname(fullNickname);

      // 2. DB 저장
      await this.databaseService.query(
        `UPDATE users
         SET nickname_hash = ?, encrypted_nickname = ?, iv_nickname = ?
         WHERE id = ?`,
        [nicknameHash, encrypted, iv, userId]
      );

      // 3. Redis 캐시
      const redisKey = `user:${userId}`;
      const redisClient = this.redisService.getClient();
      
      await redisClient.hset(redisKey, {
        nickname_hash: nicknameHash,
        nickname_enc: encrypted,
        nickname_iv: iv,
      });

      return {
        nickname,
        tag: tagStr,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to set nickname: ${error.message}`);
    }
  }
}