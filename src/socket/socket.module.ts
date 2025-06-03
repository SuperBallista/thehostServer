// src/socket/socket.module.ts
import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { ConnectionService } from './connection.service';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { UserModule } from 'src/user/user.module';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';

@Module({
  imports: [RedisModule, JwtModule, UserModule],
  providers: [LobbyGateway, LobbyService, ConnectionService, GameGateway, GameService],
})
export class SocketModule {}
