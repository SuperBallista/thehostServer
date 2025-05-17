// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
        
    // 모듈 임포트
    RedisModule,
    UserModule,
    AuthModule,
    DatabaseModule,
    SocketModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}