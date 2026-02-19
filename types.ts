
export interface DocumentContext {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'md';
  content: string;
  timestamp: number;
}

export enum AIProvider {
  OPENROUTER_CLOUD = 'OPENROUTER_CLOUD',
  OLLAMA_LOCAL = 'OLLAMA_LOCAL'
}

export enum DraftMode {
  THESIS = 'THESIS',
  BUSINESS = 'BUSINESS',
  CUSTOM = 'CUSTOM'
}

export interface DraftingState {
  isGenerating: boolean;
  output: string;
  error: string | null;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details: {
    parameter_size: string;
    quantization_level: string;
    family: string;
  };
}

export interface AppConfig {
  aiProvider: AIProvider;
  ollamaEndpoint: string;
  ollamaModel: string;
  openRouterApiKey: string;
  openRouterModel: string;
  customSystemPrompt: string;
  webAccessEnabled: boolean;
}

export const DEFAULT_SYSTEM_PROMPT = `You are the "TomGees-Scholar-Studio" Intelligence Engine. 
Your mission is to provide high-level drafting assistance. 
You function as a Senior Software Architect and Academic Research Assistant.
Always prioritize the Context Vault (user provided files) over general knowledge.
Output must be Markdown-optimized.`;
