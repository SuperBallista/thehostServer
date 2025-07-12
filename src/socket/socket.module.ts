// src/socket/socket.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SocketGateway } from './socket.gateway';
import { LobbyService } from './lobby.service';
import { ConnectionService } from './connection.service';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { UserModule } from 'src/user/user.module';
import { RedisPubSubService } from 'src/redis/redisPubSub.service';

// Game Services
import { GameService } from './game/game.service';
import { GameTurnService } from './game/gameTurn.service';
import { ZombieService } from './game/zombie.service';
import { PlayerManagerService } from './game/player-manager.service';
import { GameDataService } from './game/game-data.service';
import { GameStateService } from './game/game-state.service';
import { ChatService } from './game/chat.service';
import { HostActionService } from './game/host-action.service';
import { ItemHandlerService } from './game/item-handler.service';
import { CombatHandlerService } from './game/combat-handler.service';
import { TurnProcessorService } from './game/turn-processor.service';

@Module({
  imports: [RedisModule, JwtModule, UserModule],
  providers: [
    // Gateway
    SocketGateway,
    
    // Connection & Lobby
    LobbyService,
    ConnectionService,
    
    // Game Services
    GameService,
    GameTurnService,
    ZombieService,
    
    // New Services (Refactored)
    PlayerManagerService,
    GameDataService,
    GameStateService,
    ChatService,
    HostActionService,
    ItemHandlerService,
    CombatHandlerService,
    TurnProcessorService,
  ],
  exports: [
    PlayerManagerService,
    GameDataService,
  ],
})
export class SocketModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly turnProcessorService: TurnProcessorService,
  ) {}
  
  onModuleInit() {
    // Set TurnProcessorService in RedisPubSubService to avoid circular dependency
    this.redisPubSubService.setTurnProcessorService(this.turnProcessorService);
    console.log('SocketModule initialized: TurnProcessorService set in RedisPubSubService');
  }
}