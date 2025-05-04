// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthProvider } from './providers/google-auth.provider';
import { UserModule } from '../user/user.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { TagService } from 'src/user/tag/tag.service';
import { EncryptionService } from 'src/common/utils/encryption.service';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    JwtModule,
    ],
  controllers: [AuthController],
  providers: [AuthService, GoogleOAuthProvider,TagService, EncryptionService],
  exports: [AuthService],
})
export class AuthModule {}