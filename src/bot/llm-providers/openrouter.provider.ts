import { Injectable } from '@nestjs/common';
import {
  LLMProvider,
  LLMCompletionParams,
  LLMResponse,
  LLMModelInfo,
} from './llm-provider.interface';

@Injectable()
export class OpenRouterProvider implements LLMProvider {
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  // 2025년 최신 모델들
  public static readonly LATEST_MODELS = [
    // OpenAI 최신 모델들 (2025년 추가)
    'openai/gpt-4.1',
    'openai/gpt-4.1-mini',
    'openai/o3-mini',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',

    // Anthropic Claude 모델들
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-haiku',

    // Google Gemini 최신 모델들 (2025년 추가)
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',

    // 특화 모델들
    'minimax/minimax-m1',
    'anthracite-org/magnum-v4-72b',
  ];

  constructor(
    private apiKey: string,
    private model: string = 'google/gemini-2.5-flash-lite', // 안정적이고 가성비 좋은 모델
  ) {}

  async generateCompletion(params: LLMCompletionParams): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not provided');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/thehost-game',
          'X-Title': 'TheHost Game Bot',
        },
        body: JSON.stringify({
          model: this.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000, // 기본값 증가
          response_format:
            params.responseFormat === 'json'
              ? { type: 'json_object' }
              : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
        model?: string;
      };

      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        finishReason: data.choices?.[0]?.finish_reason as
          | 'stop'
          | 'length'
          | 'content_filter'
          | 'tool_calls'
          | 'function_call'
          | undefined,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model || this.model,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`OpenRouter provider error: ${errorMessage}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return Promise.resolve(Boolean(this.apiKey));
  }

  getModelInfo(): LLMModelInfo {
    return {
      name: this.model,
      provider: 'openrouter',
      description: `OpenRouter를 통한 ${this.model} 모델`,
      contextWindow: this.getContextWindow(),
      supportsStreaming: false,
      supportsImages:
        this.model.includes('gpt-4o') || this.model.includes('gemini'),
    };
  }

  // 최신 모델 목록 가져오기
  getLatestModels(): string[] {
    return OpenRouterProvider.LATEST_MODELS;
  }

  // 현재 모델 변경
  setModel(model: string): void {
    this.model = model;
  }

  // 현재 모델 확인
  getCurrentModel(): string {
    return this.model;
  }

  // 용도별 추천 모델
  getRecommendedModel(
    purpose: 'coding' | 'creative' | 'analysis' | 'fast' | 'cheap',
  ): string {
    switch (purpose) {
      case 'coding':
        return 'openai/gpt-4.1';
      case 'creative':
        return 'anthropic/claude-3.5-sonnet';
      case 'analysis':
        return 'google/gemini-2.5-pro';
      case 'fast':
        return 'openai/gpt-4o-mini';
      case 'cheap':
        return 'google/gemini-2.5-flash-lite';
      default:
        return 'openai/gpt-4o-mini';
    }
  }

  private getContextWindow(): number {
    // 모델별 컨텍스트 윈도우 (토큰 수)
    const contextWindows: Record<string, number> = {
      'openai/gpt-4.1': 1047576,
      'openai/gpt-4.1-mini': 1047576,
      'openai/o3-mini': 128000,
      'openai/gpt-4o': 128000,
      'openai/gpt-4o-mini': 128000,
      'anthropic/claude-3.5-sonnet': 200000,
      'anthropic/claude-3.5-haiku': 200000,
      'google/gemini-2.5-pro': 1048576,
      'google/gemini-2.5-flash': 1048576,
      'google/gemini-2.5-flash-lite': 1048576,
      'minimax/minimax-m1': 1000000,
      'anthracite-org/magnum-v4-72b': 16384,
    };

    return contextWindows[this.model] || 8192;
  }
}
