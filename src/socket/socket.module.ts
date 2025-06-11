// src/socket/socket.module.ts
import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { LobbyService } from './lobby.service';
import { ConnectionService } from './connection.service';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { UserModule } from 'src/user/user.module';
import { GameService } from './game/game.service';

@Module({
  imports: [RedisModule, JwtModule, UserModule],
  providers: [SocketGateway, LobbyService, ConnectionService, GameService],
})
export class SocketModule {}
