import { Injectable } from '@nestjs/common';
import {
  LLMProvider,
  LLMCompletionParams,
  LLMResponse,
  LLMModelInfo,
} from './llm-provider.interface';

@Injectable()
export class OllamaProvider implements LLMProvider {
  constructor(
    private apiUrl: string = 'http://localhost:11434',
    private model: string = 'llama3.2',
  ) {}

  async generateCompletion(params: LLMCompletionParams): Promise<LLMResponse> {
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
            num_predict: params.maxTokens ?? 2000,
          },
          format: params.responseFormat === 'json' ? 'json' : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        message?: { content?: string };
        done?: boolean;
        total_duration?: number;
        load_duration?: number;
        prompt_eval_duration?: number;
        eval_duration?: number;
        prompt_eval_count?: number;
        eval_count?: number;
      };

      const content = data.message?.content || '';

      return {
        content,
        finishReason: data.done ? 'stop' : undefined,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        model: this.model,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Ollama provider error: ${errorMessage}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getModelInfo(): LLMModelInfo {
    return {
      name: this.model,
      provider: 'ollama',
      description: `Ollama ${this.model} 모델 (로컬 실행)`,
      contextWindow: this.getContextWindow(),
      supportsStreaming: true,
      supportsImages:
        this.model.includes('llava') || this.model.includes('vision'),
    };
  }

  private getContextWindow(): number {
    // Ollama 모델별 컨텍스트 윈도우
    const contextWindows: Record<string, number> = {
      'llama3.2': 131072, // 128K
      'llama3.1': 131072, // 128K
      llama3: 8192,
      llama2: 4096,
      mistral: 8192,
      codellama: 16384,
      gemma: 8192,
      phi: 2048,
      qwen: 32768,
    };

    // 모델명에서 정확한 매칭 찾기
    for (const [modelName, contextWindow] of Object.entries(contextWindows)) {
      if (this.model.includes(modelName)) {
        return contextWindow;
      }
    }

    return 4096; // 기본값
  }
}
