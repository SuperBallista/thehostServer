import { Injectable } from '@nestjs/common';
import { LLMProvider, LLMCompletionParams } from './llm-provider.interface';

@Injectable()
export class OpenRouterProvider implements LLMProvider {
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    private apiKey: string,
    private model: string = 'mistralai/mixtral-8x7b-instruct'
  ) {}

  async generateCompletion(params: LLMCompletionParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not provided');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/thehost-game', // 선택사항
          'X-Title': 'TheHost Game Bot', // 선택사항
        },
        body: JSON.stringify({
          model: this.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 1000,
          response_format: params.responseFormat === 'json' 
            ? { type: 'json_object' } 
            : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenRouter provider error: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return Promise.resolve(Boolean(this.apiKey));
  }
}