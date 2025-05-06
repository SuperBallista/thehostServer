// src/socket/socket.module.ts
import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { ConnectionService } from './connection.service';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [RedisModule, JwtModule],
  providers: [LobbyGateway, LobbyService, ConnectionService],
})
export class SocketModule {}
