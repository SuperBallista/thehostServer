// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { configuration, validationSchema  } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
        
    // 모듈 임포트
    RedisModule,
    UserModule,
    AuthModule,
    DatabaseModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}