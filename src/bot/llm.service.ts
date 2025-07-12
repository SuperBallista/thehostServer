import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameContext } from './interfaces/bot.interface';
import { z } from 'zod';
import { getSystemPrompt } from './prompts/system.prompt';
import { 
  getChatDecisionPrompt, 
  getActionDecisionPrompt, 
  getTurnSummaryPrompt,
  getDefaultChatDecision,
  getDefaultAction 
} from './prompts/prompts';
import { LLMProvider } from './llm-providers/llm-provider.interface';
import { LLMProviderFactory } from './llm-providers/llm-provider.factory';
import { promises as fs } from 'fs';
import * as path from 'path';

// Zod 스키마 정의
const ChatDecisionSchema = z.object({
  shouldChat: z.boolean(),
  message: z.string().optional(),
  additionalAction: z.object({
    action: z.string(),
    params: z.record(z.any()),
  }).optional(),
  reasoning: z.string().optional(),
});

const ActionResponseSchema = z.object({
  action: z.string(),
  params: z.record(z.any()),
  reasoning: z.string().optional(),
});

const TurnSummarySchema = z.object({
  summary: z.string(),
  keyEvents: z.array(z.string()),
  relationships: z.record(z.string()),
});

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private llmProvider: LLMProvider | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmProviderFactory: LLMProviderFactory,
  ) {}

  async onModuleInit() {
    try {
      this.llmProvider = this.llmProviderFactory.createProvider();
      if (this.llmProvider && (await this.llmProvider.isAvailable())) {
        this.logger.log('LLM 서비스 초기화 완료');
      } else {
        this.logger.warn('LLM 서비스를 사용할 수 없습니다. 기본 응답을 사용합니다.');
      }
    } catch (error) {
      this.logger.error('LLM 서비스 초기화 실패:', error);
    }
  }

  /**
   * 채팅 메시지 결정
   */
  async decideChatMessage(context: GameContext): Promise<any> {
    try {
      if (!this.llmProvider || !(await this.llmProvider.isAvailable())) {
        return getDefaultChatDecision(context);
      }

      const prompt = getChatDecisionPrompt(context);
      const llmInput = {
        messages: [
          {
            role: 'system' as const,
            content: getSystemPrompt(context),
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        responseFormat: 'json' as const,
        temperature: 0.8,
        maxTokens: 400,
      };
      const content = await this.llmProvider.generateCompletion(llmInput);

      // 로그 기록
      await fs.appendFile(
        path.join(process.cwd(), 'logs', 'llm.txt'),
        `\n[decideChatMessage] INPUT: ${JSON.stringify(llmInput)}\nOUTPUT: ${content}\n`
      );

      if (!content) {
        this.logger.warn('LLM 응답이 비어있음, 기본 채팅 결정 반환');
        return getDefaultChatDecision(context);
      }

      try {
        const parsed = JSON.parse(content);
        const validated = ChatDecisionSchema.safeParse(parsed);
        if (!validated.success) {
          this.logger.warn(`LLM 채팅 결정 스키마 검증 실패: ${JSON.stringify(validated.error.issues)}`);
          this.logger.warn(`검증 실패한 응답: ${JSON.stringify(parsed)}`);
          return getDefaultChatDecision(context);
        }
        this.logger.log(`채팅 결정 완료: ${validated.data.shouldChat ? '채팅함' : '채팅안함'}`);
        return validated.data;
      } catch (parseError) {
        this.logger.warn(`LLM 채팅 결정 파싱 실패: ${parseError.message}`);
        this.logger.warn(`파싱 실패한 응답: ${content}`);
        return getDefaultChatDecision(context);
      }
    } catch (error) {
      this.logger.error(`채팅 결정 실패: ${error.message}`, error.stack);
      return getDefaultChatDecision(context);
    }
  }

  /**
   * 행동 결정
   */
  async decideAction(context: GameContext, trigger: any): Promise<any> {
    try {
      if (!this.llmProvider || !(await this.llmProvider.isAvailable())) {
        return getDefaultAction(context);
      }

      const prompt = getActionDecisionPrompt(context, trigger);
      const llmInput = {
        messages: [
          {
            role: 'system' as const,
            content: getSystemPrompt(context),
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        responseFormat: 'json' as const,
        temperature: 0.7,
        maxTokens: 400,
      };
      const content = await this.llmProvider.generateCompletion(llmInput);

      // 로그 기록
      await fs.appendFile(
        path.join(process.cwd(), 'logs', 'llm.txt'),
        `\n[decideAction] INPUT: ${JSON.stringify(llmInput)}\nOUTPUT: ${content}\n`
      );

      if (!content) {
        this.logger.warn('LLM 응답이 비어있음, 무작위 행동 반환');
        return getDefaultAction(context);
      }

      try {
        const parsed = JSON.parse(content);
        const validated = ActionResponseSchema.safeParse(parsed);
        if (!validated.success) {
          this.logger.warn(`LLM 행동 결정 스키마 검증 실패: ${JSON.stringify(validated.error.issues)}`);
          this.logger.warn(`검증 실패한 응답: ${JSON.stringify(parsed)}`);
          return getDefaultAction(context);
        }
        this.logger.log(`행동 결정: ${validated.data.action}`, validated.data.reasoning);
        return validated.data;
      } catch (parseError) {
        this.logger.warn(`LLM 행동 결정 파싱 실패: ${parseError.message}`);
        this.logger.warn(`파싱 실패한 응답: ${content}`);
        return getDefaultAction(context);
      }
    } catch (error) {
      this.logger.error(`행동 결정 실패: ${error.message}`, error.stack);
      return getDefaultAction(context);
    }
  }

  /**
   * 턴 요약
   */
  async summarizeTurn(events: any[]): Promise<any> {
    try {
      if (!this.llmProvider || !(await this.llmProvider.isAvailable())) {
        return {
          summary: '턴 요약을 생성할 수 없습니다.',
          keyEvents: [],
          relationships: {},
        };
      }

      const prompt = getTurnSummaryPrompt(events);
      const llmInput = {
        messages: [
          {
            role: 'system' as const,
            content: '당신은 게임 상황을 요약하는 AI입니다.',
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        responseFormat: 'json' as const,
        temperature: 0.5,
        maxTokens: 1000,
      };
      const content = await this.llmProvider.generateCompletion(llmInput);

      // 로그 기록
      await fs.appendFile(
        path.join(process.cwd(), 'logs', 'llm.txt'),
        `\n[summarizeTurn] INPUT: ${JSON.stringify(llmInput)}\nOUTPUT: ${content}\n`
      );

      if (!content) {
        this.logger.warn('LLM 응답이 비어있음, 기본 요약 반환');
        return {
          summary: '이번 턴에 특별한 일이 없었습니다.',
          keyEvents: [],
          relationships: {},
        };
      }

      try {
        const parsed = JSON.parse(content);
        const validated = TurnSummarySchema.safeParse(parsed);
        if (!validated.success) {
          this.logger.warn(`LLM 턴 요약 스키마 검증 실패: ${JSON.stringify(validated.error.issues)}`);
          this.logger.warn(`검증 실패한 응답: ${JSON.stringify(parsed)}`);
          return {
            summary: '턴 요약 생성에 실패했습니다.',
            keyEvents: [],
            relationships: {},
          };
        }
        this.logger.log('턴 요약 완료');
        return validated.data;
      } catch (parseError) {
        this.logger.warn(`LLM 턴 요약 파싱 실패: ${parseError.message}`);
        this.logger.warn(`파싱 실패한 응답: ${content}`);
        return {
          summary: '턴 요약 파싱에 실패했습니다.',
          keyEvents: [],
          relationships: {},
        };
      }
    } catch (error) {
      this.logger.error(`턴 요약 실패: ${error.message}`, error.stack);
      return {
        summary: '턴 요약 중 오류가 발생했습니다.',
        keyEvents: [],
        relationships: {},
      };
    }
  }
}