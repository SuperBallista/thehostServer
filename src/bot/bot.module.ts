import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { LLMService } from './llm.service';
import { TriggerService } from './trigger.service';
import { ActionService } from './action.service';
import { MemoryService } from './memory.service';
import { RedisModule } from '../redis/redis.module';
import { SocketModule } from '../socket/socket.module';
import { LLMProviderFactory } from './llm-providers/llm-provider.factory';

@Module({
  imports: [RedisModule, SocketModule],
  providers: [
    BotService,
    LLMService,
    TriggerService,
    ActionService,
    MemoryService,
    LLMProviderFactory, // 의존성 문제 해결을 위해 추가
  ],
  exports: [BotService],
})
export class BotModule {}