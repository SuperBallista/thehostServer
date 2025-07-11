export interface LLMProvider {
  generateCompletion(params: LLMCompletionParams): Promise<string>;
  isAvailable(): boolean;
}

export interface LLMCompletionParams {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface LLMConfig {
  provider: 'openai' | 'ollama' | 'openrouter' | 'custom';
  apiKey?: string;
  apiUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}