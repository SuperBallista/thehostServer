// user/user.module.ts (수정)
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserCacheService } from './user-cache.service';
import { RedisModule } from '../redis/redis.module';
import { DatabaseModule } from '../database/database.module'; 
import { UserInitService } from './user-init.service';
import { UserRepository } from './user.repository';
import { EncryptionService } from 'src/common/utils/encryption.service';

@Module({
  imports: [RedisModule, DatabaseModule],
  providers: [UserService, UserCacheService, UserInitService, UserRepository, EncryptionService],
  exports: [UserService, UserCacheService],
})
export class UserModule {}