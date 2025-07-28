import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameContext } from './interfaces/bot.interface';
import { z } from 'zod';
import { getSystemPrompt } from './prompts/system.prompt';
import {
  getChatDecisionPrompt,
  getTurnSummaryPrompt,
  getDefaultChatDecision,
  getDefaultAction,
  buildChatOnlyPrompt,
  buildActionOnlyPrompt,
} from './prompts/prompts';
import {
  convertItemCodeToKorean,
  ITEM_CODE_TO_KOREAN,
} from './constants/item-mappings';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * GameContext를 한글로 변환하는 헬퍼 함수
 */
function convertContextToKorean(context: GameContext) {
  return {
    ...context,
    // 아이템명을 한글로 변환
    currentItems: context.currentItems.map(
      (item) => convertItemCodeToKorean(item) || item,
    ),
    // 역할을 한글로 변환
    role:
      context.role === 'survivor'
        ? '생존자'
        : context.role === 'host'
          ? '숙주'
          : context.role,
  };
}
import { LLMProvider } from './llm-providers/llm-provider.interface';
import { LLMProviderFactory } from './llm-providers/llm-provider.factory';

// 타입 정의 추가
interface ParsedActionResponse {
  action: string;
  params: Record<string, unknown>;
  reasoning?: string;
}

interface ParsedChatResponse {
  shouldChat: boolean;
  message?: string;
  additionalAction?: {
    action: string;
    params: Record<string, unknown>;
  };
  reasoning?: string;
}

// Zod 스키마 정의
const ChatDecisionSchema = z.object({
  shouldChat: z.boolean(),
  message: z.string().optional(),
  additionalAction: z
    .object({
      action: z.string(),
      params: z.record(z.any()),
    })
    .optional(),
  reasoning: z.string().optional(),
});

const ActionResponseSchema = z.object({
  action: z.string(),
  params: z.record(z.any()),
  reasoning: z.string().optional(),
});

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private llmProvider: LLMProvider | null = null;

  /**
   * 로그 파일에 기록하는 헬퍼 메소드
   */
  private async writeLog(gameId: string, logType: string, input: any, output: string): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      
      // logs 디렉토리가 없으면 생성
      try {
        await fs.access(logsDir);
      } catch {
        await fs.mkdir(logsDir, { recursive: true });
        this.logger.log(`Created logs directory: ${logsDir}`);
      }

      const logFileName = `llm_${gameId}.txt`;
      const logPath = path.join(logsDir, logFileName);
      const logEntry = `\n[${logType}] INPUT: ${JSON.stringify(input, null, 2)}\nOUTPUT: ${output}\nTIMESTAMP: ${new Date().toISOString()}\n${'='.repeat(50)}\n`;
      
      await fs.appendFile(logPath, logEntry);
      
      this.logger.debug(`Log written to: ${logPath}`);
    } catch (error) {
      this.logger.error(`Failed to write log for game ${gameId}:`, error);
    }
  }

  /**
   * LLM 응답에서 영어 아이템 코드를 한글로 변환
   */
  private convertEnglishItemCodesToKorean(text: string): string {
    if (!text) return text;

    let convertedText = text;

    // 모든 영어 아이템 코드를 한글로 변환
    Object.entries(ITEM_CODE_TO_KOREAN).forEach(([code, koreanName]) => {
      if (koreanName && convertedText.includes(code)) {
        // 단어 경계를 확인하여 정확한 매칭만 변환
        const regex = new RegExp(`\\b${code}\\b`, 'g');
        convertedText = convertedText.replace(regex, koreanName);
      }
    });

    return convertedText;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly llmProviderFactory: LLMProviderFactory,
  ) {}

  /**
   * AI가 생성한 액션을 수정하는 헬퍼 함수
   */
  private fixActionFormat(action: ParsedActionResponse): ParsedActionResponse {
    if (!action || !action.action) return action;

    // myStatus를 myStatus.next로 수정 (params에 location이 있는 경우)
    if (action.action === 'myStatus' && action.params?.location) {
      this.logger.warn(`액션 형식 수정: myStatus -> myStatus.next`);
      return {
        ...action,
        action: 'myStatus.next',
        params: { location: action.params.location },
      };
    }

    // myStatus를 myStatus.act로 수정 (params에 action이 있는 경우)
    if (action.action === 'myStatus' && action.params?.action) {
      this.logger.warn(`액션 형식 수정: myStatus -> myStatus.act`);
      return {
        ...action,
        action: 'myStatus.act',
        params: { action: action.params.action },
      };
    }

    // hostAct를 hostAct.infect로 수정 (params에 target이 있는 경우)
    if (
      action.action === 'hostAct' &&
      action.params?.target &&
      !action.params?.zombies
    ) {
      this.logger.warn(`액션 형식 수정: hostAct -> hostAct.infect`);
      return {
        ...action,
        action: 'hostAct.infect',
        params: { target: action.params.target },
      };
    }

    // hostAct를 hostAct.zombieList로 수정 (params에 zombies가 있는 경우)
    if (action.action === 'hostAct' && action.params?.zombies) {
      this.logger.warn(`액션 형식 수정: hostAct -> hostAct.zombieList`);
      return {
        ...action,
        action: 'hostAct.zombieList',
        params: { zombies: action.params.zombies },
      };
    }

    // params 내부의 중첩된 구조 수정
    if (
      action.action === 'myStatus' &&
      'next' in action.params &&
      typeof action.params.next === 'object' &&
      action.params.next !== null &&
      'location' in action.params.next
    ) {
      this.logger.warn(
        `액션 형식 수정: myStatus (중첩된 next) -> myStatus.next`,
      );
      const nextObj = action.params.next as { location: unknown };
      return {
        ...action,
        action: 'myStatus.next',
        params: { location: nextObj.location },
      };
    }

    return action;
  }

  async onModuleInit() {
    try {
      this.llmProvider = this.llmProviderFactory.createProvider();
      if (this.llmProvider && (await this.llmProvider.isAvailable())) {
        this.logger.log('LLM 서비스 초기화 완료');
      } else {
        this.logger.warn(
          'LLM 서비스를 사용할 수 없습니다. 기본 응답을 사용합니다.',
        );
      }
    } catch (error) {
      this.logger.error('LLM 서비스 초기화 실패:', error);
    }
  }

  /**
   * 채팅 메시지 결정 (기존 함수 - 하위 호환성 유지)
   */
  async decideChatMessage(context: GameContext): Promise<any> {
    try {
      if (!this.llmProvider || !(await this.llmProvider.isAvailable())) {
        return getDefaultChatDecision();
      }

      // Context를 한글로 변환
      const koreanContext = convertContextToKorean(context);

      const prompt = getChatDecisionPrompt(koreanContext as GameContext);
      const llmInput = {
        messages: [
          {
            role: 'system' as const,
            content:
              getSystemPrompt(context) +
              '\n\n【IMPORTANT】JSON 응답은 반드시 한글로 작성하세요. location은 "해안", "폐건물", "정글", "동굴", "산 정상", "개울" 중 하나여야 합니다. 아이템명도 반드시 한글로 사용하세요.',
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
      const response = await this.llmProvider.generateCompletion(llmInput);
      const content = response.content;

      // 로그 기록 (상세한 컨텍스트 포함, currentItemCodes 제외)
      const contextForLog = { ...context };
      if ('currentItemCodes' in contextForLog) {
        delete (contextForLog as Record<string, unknown>).currentItemCodes;
      }
      const detailedLog = {
        llmInput,
        gameContext: contextForLog,
        timestamp: new Date().toISOString(),
      };
      await this.writeLog(context.gameId, 'decideChatMessage', detailedLog, content);

      if (!content) {
        this.logger.warn('LLM 응답이 비어있음, 기본 채팅 결정 반환');
        return getDefaultChatDecision();
      }

      try {
        // 영어 아이템 코드를 한글로 변환
        const convertedContent = this.convertEnglishItemCodesToKorean(content);

        // JSON 응답 파싱 시도
        let parsed: ParsedChatResponse;
        try {
          parsed = JSON.parse(convertedContent) as ParsedChatResponse;
        } catch (jsonError) {
          // JSON 파싱 실패 시 코드 블록 추출 시도
          const jsonMatch = convertedContent.match(
            /```(?:json)?\s*({[\s\S]*?})\s*```/,
          );
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1]) as ParsedChatResponse;
          } else {
            throw jsonError;
          }
        }

        // 채팅 메시지에서도 영어 아이템 코드를 한글로 변환
        if (parsed.message) {
          parsed.message = this.convertEnglishItemCodesToKorean(parsed.message);
        }

        // additionalAction의 content 파라미터도 변환 (마이크, 무전기, 낙서 등)
        if (
          parsed.additionalAction &&
          parsed.additionalAction.params &&
          parsed.additionalAction.params.content &&
          typeof parsed.additionalAction.params.content === 'string'
        ) {
          parsed.additionalAction.params.content =
            this.convertEnglishItemCodesToKorean(
              parsed.additionalAction.params.content,
            );
        }

        // additionalAction이 있으면 형식 수정
        if (parsed.additionalAction) {
          parsed.additionalAction = this.fixActionFormat(
            parsed.additionalAction as ParsedActionResponse,
          );
        }

        const validated = ChatDecisionSchema.safeParse(parsed);
        if (!validated.success) {
          this.logger.warn(
            `LLM 채팅 결정 스키마 검증 실패: ${JSON.stringify(validated.error.issues)}`,
          );
          this.logger.warn(`검증 실패한 응답: ${JSON.stringify(parsed)}`);

          // 부분적으로 유효한 응답 처리
          if (parsed && typeof parsed.shouldChat === 'boolean') {
            return {
              shouldChat: parsed.shouldChat,
              message: parsed.message || undefined,
              additionalAction: parsed.additionalAction || undefined,
              reasoning: parsed.reasoning || undefined,
            };
          }

          return getDefaultChatDecision();
        }
        this.logger.log(
          `채팅 결정 완료: ${validated.data.shouldChat ? '채팅함' : '채팅안함'}`,
        );
        return validated.data;
      } catch (parseError: unknown) {
        const errorMessage =
          parseError instanceof Error
            ? parseError.message
            : 'Unknown parsing error';
        this.logger.warn(`LLM 채팅 결정 파싱 실패: ${errorMessage}`);
        this.logger.warn(`파싱 실패한 응답: ${content}`);
        return getDefaultChatDecision();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`채팅 결정 실패: ${errorMessage}`, errorStack);
      return getDefaultChatDecision();
    }
  }

  /**
   * 채팅 전용 결정 (텍스트 출력)
   */
  async decideChatOnly(
    context: GameContext,
  ): Promise<{ shouldChat: boolean; message?: string; reasoning: string }> {
    try {
      if (!this.llmProvider || !(await this.llmProvider.isAvailable())) {
        return getDefaultChatDecision();
      }

      // Context를 한글로 변환
      const koreanContext = convertContextToKorean(context);
      const prompt = buildChatOnlyPrompt(koreanContext as GameContext);

      const llmInput = {
        messages: [
          {
            role: 'system' as const,
            content: `당신은 숙주 추리 게임의 봇 플레이어입니다. 현재 상황을 분석하여 채팅 메세지를 보내세요.
성격: ${context.personality.mbti} / ${context.personality.gender === 'male' ? '남성' : '여성'}
역할: ${context.role === 'host' ? '숙주 (다른 플레이어에게는 생존자로 보임)' : '생존자'}

응답 형식:
- 채팅하는 경우: 메시지 내용만 출력 (큰따옴표 없이)
- 채팅을 원치 않는 경우: ### (특수문자 3개만)`,
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        responseFormat: 'text' as const,
        temperature: 0.8,
        maxTokens: 200,
      };

      const llmResponse = await this.llmProvider.generateCompletion(llmInput);
      const content = llmResponse.content;

      // 로그 기록
      await this.writeLog(context.gameId, 'decideChatOnly', llmInput, content);

      if (!content) {
        this.logger.warn('LLM 응답이 비어있음, 기본 채팅 결정 반환');
        return getDefaultChatDecision();
      }

      // 텍스트 응답 파싱
      const responseText = content.trim();

      // 채팅하지 않는 경우 (특수문자 조합)
      if (responseText === '###') {
        this.logger.log('채팅 결정: 채팅안함');
        return {
          shouldChat: false,
          reasoning: '상황상 채팅 불필요',
        };
      }

      // 나머지는 모두 채팅 메시지로 처리
      const convertedMessage =
        this.convertEnglishItemCodesToKorean(responseText);

      this.logger.log(`채팅 결정: 채팅함 - ${convertedMessage}`);
      return {
        shouldChat: true,
        message: convertedMessage,
        reasoning: '상황에 적절한 채팅 메시지',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`채팅 결정 실패: ${errorMessage}`, errorStack);
      return getDefaultChatDecision();
    }
  }

  /**
   * 게임 액션 결정 (JSON 응답)
   */
  async decideGameAction(context: GameContext): Promise<{
    action: string;
    params: Record<string, any>;
    reasoning?: string;
  }> {
    try {
      if (!this.llmProvider || !(await this.llmProvider.isAvailable())) {
        return getDefaultAction(context);
      }

      // Context를 한글로 변환
      const koreanContext = convertContextToKorean(context);
      const prompt = buildActionOnlyPrompt(koreanContext as GameContext);

      const llmInput = {
        messages: [
          {
            role: 'system' as const,
            content: `당신은 숙주 추리 게임의 ${context.role === 'host' ? '숙주' : '생존자'} 봇 플레이어입니다.
성격: ${context.personality.mbti} / ${context.personality.gender === 'male' ? '남성' : '여성'}

현재 상황을 분석하여 최적의 행동을 JSON 형식으로 결정하세요.
반드시 유효한 JSON 형식으로 응답하며, 모든 텍스트는 한글로 작성하세요.
location은 "해안", "폐건물", "정글", "동굴", "산 정상", "개울" 중 하나여야 합니다.
아이템명도 반드시 한글로 사용하세요.`,
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        responseFormat: 'json' as const,
        temperature: 0.7,
        maxTokens: 300,
      };

      const llmResponse = await this.llmProvider.generateCompletion(llmInput);
      const content = llmResponse.content;

      // 로그 기록
      await this.writeLog(context.gameId, 'decideGameAction', llmInput, content);

      if (!content) {
        this.logger.warn('LLM 응답이 비어있음, 기본 행동 반환');
        return getDefaultAction(context);
      }

      try {
        // 영어 아이템 코드를 한글로 변환
        const convertedContent = this.convertEnglishItemCodesToKorean(content);

        // JSON 응답 파싱 시도
        let parsed: ParsedActionResponse;
        try {
          parsed = JSON.parse(convertedContent) as ParsedActionResponse;
        } catch (jsonError) {
          // JSON 파싱 실패 시 코드 블록 추출 시도
          const jsonMatch = convertedContent.match(
            /```(?:json)?\s*({[\s\S]*?})\s*```/,
          );
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1]) as ParsedActionResponse;
          } else {
            throw jsonError;
          }
        }

        // 파라미터에서 텍스트 내용 변환 (content, message 등)
        if (parsed.params) {
          if (
            parsed.params.content &&
            typeof parsed.params.content === 'string'
          ) {
            parsed.params.content = this.convertEnglishItemCodesToKorean(
              parsed.params.content,
            );
          }
          if (
            parsed.params.message &&
            typeof parsed.params.message === 'string'
          ) {
            parsed.params.message = this.convertEnglishItemCodesToKorean(
              parsed.params.message,
            );
          }
        }

        // 행동 형식 수정
        const fixedAction = this.fixActionFormat(parsed);

        const validated = ActionResponseSchema.safeParse(fixedAction);
        if (!validated.success) {
          this.logger.warn(
            `LLM 행동 결정 스키마 검증 실패: ${JSON.stringify(validated.error.issues)}`,
          );
          this.logger.warn(`검증 실패한 응답: ${JSON.stringify(fixedAction)}`);

          // 부분적으로 유효한 응답 처리
          if (fixedAction && fixedAction.action && fixedAction.params) {
            return {
              action: fixedAction.action,
              params: fixedAction.params,
              reasoning: fixedAction.reasoning || '행동 결정',
            };
          }

          return getDefaultAction(context);
        }

        this.logger.log(`행동 결정 완료: ${validated.data.action}`);
        return validated.data;
      } catch (parseError: unknown) {
        const errorMessage =
          parseError instanceof Error
            ? parseError.message
            : 'Unknown parsing error';
        this.logger.warn(`LLM 행동 결정 파싱 실패: ${errorMessage}`);
        this.logger.warn(`파싱 실패한 응답: ${content}`);
        return getDefaultAction(context);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`게임 행동 결정 실패: ${errorMessage}`, errorStack);
      return getDefaultAction(context);
    }
  }

  /**
   * 턴 요약
   */
  async summarizeTurn(
    events: Array<{ message: string }>,
    gameId: string,
  ): Promise<{ summary: string }> {
    try {
      if (!this.llmProvider || !(await this.llmProvider.isAvailable())) {
        return {
          summary: '턴 요약을 생성할 수 없습니다.',
        };
      }

      const prompt = getTurnSummaryPrompt(events);
      const llmInput = {
        messages: [
          {
            role: 'system' as const,
            content:
              '당신은 숙주 추리 게임의 상황을 요약하는 AI입니다.\n\n【게임 설명】\n- 숙주 추리 게임: 생존자들이 숨어있는 숙주를 찾아 백신으로 치료해야 하는 게임\n- 숙주는 생존자들을 감염시켜 좀비로 만들려 하고, 생존자들은 협력하여 백신 재료를 모아 숙주를 치료해야 함\n- 5턴부터 좀비가 등장하며, 좀비가 된 플레이어의 5턴 전 위치를 통해 숙주를 추리할 수 있음\n\n【IMPORTANT】\n- 요약은 한글로 작성하세요\n- JSON 형식이 아닌 일반 텍스트로 작성하세요\n- 간결하고 핵심적인 내용만 포함하세요',
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        temperature: 0.5,
        maxTokens: 300,
      };
      const llmResponse = await this.llmProvider.generateCompletion(llmInput);
      const content = llmResponse.content;

      // 로그 기록 (상세한 컨텍스트 포함)
      const detailedLog = {
        llmInput,
        gameContext: events,
        timestamp: new Date().toISOString(),
      };
      await this.writeLog(gameId, 'summarizeTurn', detailedLog, content);

      if (!content || content.trim() === '') {
        this.logger.warn('LLM 응답이 비어있음, 기본 요약 반환');
        return {
          summary: '이번 턴에 특별한 일이 없었습니다.',
        };
      }

      // 일반 텍스트 응답을 그대로 사용
      const cleanedSummary = content.trim();
      this.logger.log('턴 요약 완료');
      return {
        summary: cleanedSummary,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`턴 요약 실패: ${errorMessage}`, errorStack);
      return {
        summary: '턴 요약 중 오류가 발생했습니다.',
      };
    }
  }
}
