import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameContext } from './interfaces/bot.interface';
import { BotTrigger } from './interfaces/trigger.interface';
import { z } from 'zod';
import { getSystemPrompt } from './prompts/system.prompt';
import { 
  getTriggerGenerationPrompt, 
  getActionDecisionPrompt, 
  getTurnSummaryPrompt,
  getDefaultTriggers,
  getDefaultAction 
} from './prompts/prompts';
import { LLMProvider } from './llm-providers/llm-provider.interface';
import { LLMProviderFactory } from './llm-providers/llm-provider.factory';

// Zod 스키마 정의
const TriggerSchema = z.object({
  id: z.string(),
  type: z.enum(['time', 'chat', 'radio']),
  condition: z.union([
    z.object({
      seconds: z.number(),
      turnStart: z.boolean(),
    }),
    z.object({
      pattern: z.string(),
      sender: z.enum(['any', 'specific']),
      senderId: z.number().optional(),
    }),
  ]),
  priority: z.number(),
  action: z.string(),
  metadata: z.object({
    description: z.string(),
  }).optional(),
});

const TriggersResponseSchema = z.object({
  triggers: z.array(TriggerSchema).max(5),
});

const ActionResponseSchema = z.object({
  action: z.string(),
  params: z.record(z.any()),
  reasoning: z.string().optional(),
});

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private llmProvider: LLMProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmProviderFactory: LLMProviderFactory
  ) {}

  onModuleInit() {
    try {
      this.llmProvider = this.llmProviderFactory.createProvider();
      
      if (!this.llmProvider.isAvailable()) {
        this.logger.warn('LLM 프로바이더를 사용할 수 없습니다. 기본 동작으로 대체됩니다.');
      }
    } catch (error) {
      this.logger.error(`LLM 프로바이더 초기화 실패: ${error.message}`);
    }
  }

  /**
   * 트리거 생성
   */
  async generateTriggers(context: GameContext): Promise<BotTrigger[]> {
    try {
      if (!this.llmProvider || !this.llmProvider.isAvailable()) {
        return getDefaultTriggers(context);
      }

      const prompt = getTriggerGenerationPrompt(context);
      
      const content = await this.llmProvider.generateCompletion({
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(context),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        responseFormat: 'json',
        temperature: 0.7,
        maxTokens: 1000,
      });

      if (!content) {
        throw new Error('LLM 응답이 비어있음');
      }

      const parsed = JSON.parse(content);
      const validated = TriggersResponseSchema.parse(parsed);
      
      this.logger.log(`트리거 생성 완료: ${validated.triggers.length}개`);
      return validated.triggers;
      
    } catch (error) {
      this.logger.error(`트리거 생성 실패: ${error.message}`, error.stack);
      return getDefaultTriggers(context);
    }
  }

  /**
   * 행동 결정
   */
  async decideAction(context: GameContext, trigger: any): Promise<any> {
    try {
      if (!this.llmProvider || !this.llmProvider.isAvailable()) {
        return getDefaultAction(context);
      }

      const prompt = getActionDecisionPrompt(context, trigger);
      
      const content = await this.llmProvider.generateCompletion({
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(context),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        responseFormat: 'json',
        temperature: 0.7,
        maxTokens: 500,
      });

      if (!content) {
        throw new Error('LLM 응답이 비어있음');
      }

      const parsed = JSON.parse(content);
      const validated = ActionResponseSchema.parse(parsed);
      
      this.logger.log(`행동 결정: ${validated.action}`, validated.reasoning);
      return validated;
      
    } catch (error) {
      this.logger.error(`행동 결정 실패: ${error.message}`, error.stack);
      return getDefaultAction(context);
    }
  }

  /**
   * 턴 요약
   */
  async summarizeTurn(events: any[]): Promise<string> {
    try {
      if (!this.llmProvider || !this.llmProvider.isAvailable()) {
        return '이번 턴 요약을 생성할 수 없습니다.';
      }

      const prompt = getTurnSummaryPrompt(events);

      const content = await this.llmProvider.generateCompletion({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        maxTokens: 150,
      });

      return content || '이번 턴에 특별한 일은 없었습니다.';
      
    } catch (error) {
      this.logger.error(`턴 요약 실패: ${error.message}`, error.stack);
      return '이번 턴 요약을 생성할 수 없습니다.';
    }
  }

}