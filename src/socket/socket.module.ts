// src/socket/socket.module.ts
import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { LobbyModule } from './lobby.module';
import { GameModule } from './game.module';
import { UserConnectionModule } from './user-connection.module';

@Module({
  imports: [LobbyModule, GameModule, UserConnectionModule],
  providers: [SocketGateway],
})
export class SocketModule {}
