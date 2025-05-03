// profile/profile.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseProvider } from '../database/database.provider';
import { RedisService } from '../redis/redis.service';
import { TagService } from '../user/tag/tag.service';
import { EncryptionService } from '../common/utils/encryption.service';
import { JwtService } from 'src/jwt/jwt.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly databaseProvider: DatabaseProvider,
    private readonly redisService: RedisService,
    private readonly tagService: TagService,
    private readonly encryptionService: EncryptionService,
    private readonly jwtService: JwtService,
  ) {}
  private async prepareEncryptedNickname(nickname: string): Promise<{
    nicknameHash: string;
    encrypted: string;
    iv: string;
    fullNickname: string;
    tag: string;
  }> {
    this.validateNickname(nickname);
  
    const tag = await this.tagService.generateTag();
    const fullNickname = `${nickname}#${tag}`;
  
    const nicknameHash = this.encryptionService.hashString(nickname);
    const { encrypted, iv } = this.encryptionService.encryptNickname(fullNickname);
  
    return { nicknameHash, encrypted, iv, fullNickname, tag };
  }
  



