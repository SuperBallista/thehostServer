// profile/profile.module.ts
import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { EncryptionService } from 'src/common/utils/encryption.service';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    ConfigModule,
    JwtModule
  ],
  controllers: [ProfileController],
  providers: [ProfileService, EncryptionService],
  exports: [ProfileService ],
})
export class ProfileModule {}