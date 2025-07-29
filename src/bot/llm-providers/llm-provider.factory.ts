import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMConfig } from './llm-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenRouterProvider } from './openrouter.provider';

@Injectable()
export class LLMProviderFactory {
  private readonly logger = new Logger(LLMProviderFactory.name);

  constructor(private readonly configService: ConfigService) {}

  createProvider(): LLMProvider {
    const config = this.getLLMConfig();

    this.logger.log(
      `LLM 프로바이더 생성: ${config.provider} (모델: ${config.model})`,
    );

    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config.apiKey || '', config.model);

      case 'ollama':
        return new OllamaProvider(config.apiUrl, config.model);

      case 'openrouter':
        return new OpenRouterProvider(config.apiKey || '', config.model);

      default:
        throw new Error(`지원하지 않는 LLM 프로바이더: ${config.provider}`);
    }
  }

  private getLLMConfig(): LLMConfig {
    const provider = this.configService.get<string>(
      'LLM_PROVIDER',
      'ollama',
    ) as 'openai' | 'anthropic' | 'google' | 'ollama' | 'openrouter' | 'custom';

    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const apiUrl = this.configService.get<string>('LLM_API_URL');
    const model = this.configService.get<string>(
      'LLM_MODEL',
      this.getDefaultModel(provider),
    );
    const temperature = this.configService.get<number>('LLM_TEMPERATURE', 0.7);
    const maxTokens = this.configService.get<number>('LLM_MAX_TOKENS', 2000);

    return {
      provider,
      apiKey,
      apiUrl,
      model,
      temperature,
      maxTokens,
    };
  }

  private getDefaultModel(provider: LLMConfig['provider']): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'ollama':
        return 'llama3.2';
      case 'openrouter':
        return 'google/gemini-2.5-flash-lite';
      case 'anthropic':
        return 'claude-3.5-sonnet';
      case 'google':
        return 'gemini-2.5-flash';
      default:
        return 'llama3.2';
    }
  }
}
