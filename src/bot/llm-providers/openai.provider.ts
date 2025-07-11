import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { LLMProvider, LLMCompletionParams } from './llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI | null = null;

  constructor(private apiKey: string, private model: string) {
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  async generateCompletion(params: LLMCompletionParams): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1000,
      response_format: params.responseFormat === 'json' 
        ? { type: 'json_object' } 
        : undefined,
    });

    return response.choices[0]?.message?.content || '';
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}