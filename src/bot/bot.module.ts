import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { ActionService } from './action.service';
import { MemoryService } from './memory.service';
import { LLMService } from './llm.service';
import { LLMProviderFactory } from './llm-providers/llm-provider.factory';
import { GameModule } from '../socket/game.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    forwardRef(() => GameModule),
    RedisModule,
  ],
  providers: [
    BotService,
    ActionService,
    MemoryService,
    LLMService,
    LLMProviderFactory,
  ],
  exports: [
    BotService,
    ActionService,
    MemoryService,
    LLMService,
    LLMProviderFactory,
  ],
})
export class BotModule {}