import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  LLMProvider,
  LLMCompletionParams,
  LLMResponse,
  LLMModelInfo,
} from './llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI | null = null;

  constructor(
    private apiKey: string,
    private model: string,
  ) {
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  async generateCompletion(params: LLMCompletionParams): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2000,
        response_format:
          params.responseFormat === 'json'
            ? { type: 'json_object' }
            : undefined,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        finishReason: response.choices[0]?.finish_reason as
          | 'stop'
          | 'length'
          | 'content_filter'
          | 'tool_calls'
          | 'function_call'
          | undefined,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model || this.model,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI provider error: ${errorMessage}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return Promise.resolve(this.client !== null);
  }

  getModelInfo(): LLMModelInfo {
    return {
      name: this.model,
      provider: 'openai',
      description: `OpenAI ${this.model} 모델`,
      contextWindow: this.getContextWindow(),
      supportsStreaming: true,
      supportsImages:
        this.model.includes('gpt-4o') || this.model.includes('gpt-4-vision'),
      pricing: this.getModelPricing(),
    };
  }

  private getContextWindow(): number {
    // OpenAI 모델별 컨텍스트 윈도우
    const contextWindows: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
    };

    // 모델명에서 정확한 매칭 찾기
    for (const [modelName, contextWindow] of Object.entries(contextWindows)) {
      if (this.model.includes(modelName)) {
        return contextWindow;
      }
    }

    return 4096; // 기본값
  }

  private getModelPricing(): { input: number; output: number } {
    // OpenAI 모델별 가격 (USD per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 30.0, output: 60.0 },
      'gpt-4-32k': { input: 60.0, output: 120.0 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      'gpt-4o': { input: 5.0, output: 15.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };

    // 모델명에서 정확한 매칭 찾기
    for (const [modelName, modelPricing] of Object.entries(pricing)) {
      if (this.model.includes(modelName)) {
        return modelPricing;
      }
    }

    return { input: 1.0, output: 2.0 }; // 기본값
  }
}
