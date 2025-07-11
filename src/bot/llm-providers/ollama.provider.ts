import { Injectable } from '@nestjs/common';
import { LLMProvider, LLMCompletionParams } from './llm-provider.interface';

@Injectable()
export class OllamaProvider implements LLMProvider {
  constructor(
    private apiUrl: string = 'http://localhost:11434',
    private model: string = 'llama2'
  ) {}

  async generateCompletion(params: LLMCompletionParams): Promise<string> {
    try {
      // Ollama chat API 형식으로 변환
      const response = await fetch(`${this.apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: params.messages,
          stream: false,
          options: {
            temperature: params.temperature ?? 0.7,
            num_predict: params.maxTokens ?? 1000,
          },
          format: params.responseFormat === 'json' ? 'json' : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      throw new Error(`Ollama provider error: ${error.message}`);
    }
  }

  async isAvailable(): boolean {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}