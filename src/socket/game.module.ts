import { Module, forwardRef } from '@nestjs/common';
import { GameService } from './game/game.service';
import { GameTurnService } from './game/gameTurn.service';
import { PlayerManagerService } from './game/player-manager.service';
import { GameDataService } from './game/game-data.service';
import { GameStateService } from './game/game-state.service';
import { ChatService } from './game/chat.service';
import { HostActionService } from './game/host-action.service';
import { ItemHandlerService } from './game/item-handler.service';
import { CombatHandlerService } from './game/combat-handler.service';
import { ZombieService } from './game/zombie.service';
import { TurnProcessorService } from './game/turn-processor.service';
import { UserConnectionModule } from './user-connection.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    forwardRef(() => UserConnectionModule),
    forwardRef(() => BotModule),
  ],
  providers: [
    GameService,
    GameTurnService,
    PlayerManagerService,
    GameDataService,
    GameStateService,
    ChatService,
    HostActionService,
    ItemHandlerService,
    CombatHandlerService,
    ZombieService,
    TurnProcessorService,
  ],
  exports: [
    GameService,
    GameTurnService,
    PlayerManagerService,
    GameDataService,
    GameStateService,
    ChatService,
    HostActionService,
    ItemHandlerService,
    CombatHandlerService,
    ZombieService,
    TurnProcessorService,
  ],
})
export class GameModule {}
