export interface LLMProvider {
  generateCompletion(params: LLMCompletionParams): Promise<LLMResponse>;
  generateStream?(params: LLMCompletionParams): AsyncIterable<LLMStreamChunk>;
  isAvailable(): Promise<boolean>;
  countTokens?(text: string): Promise<number>;
  getModelInfo(): LLMModelInfo;
}

export interface LLMCompletionParams {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  stream?: boolean;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  seed?: number;
  thinking?: boolean; // For reasoning models like o3, Claude 4
}

export interface LLMResponse {
  content: string;
  finishReason?:
    | 'stop'
    | 'length'
    | 'content_filter'
    | 'tool_calls'
    | 'function_call';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  reasoning?: string; // For reasoning models
}

export interface LLMStreamChunk {
  content: string;
  finishReason?:
    | 'stop'
    | 'length'
    | 'content_filter'
    | 'tool_calls'
    | 'function_call';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMModelInfo {
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsImages?: boolean;
  pricing?: {
    input: number; // USD per 1M tokens
    output: number; // USD per 1M tokens
  };
}

export interface LLMConfig {
  provider:
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'ollama'
    | 'openrouter'
    | 'custom';
  apiKey?: string;
  apiUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface LLMProviderError extends Error {
  type:
    | 'rate_limit'
    | 'invalid_request'
    | 'authentication'
    | 'timeout'
    | 'server_error';
  retryable: boolean;
  retryAfter?: number;
}
