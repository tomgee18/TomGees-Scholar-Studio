export interface DocumentContext {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'md';
  content: string;
  timestamp: number;
  sizeBytes: number;
  enabled?: boolean;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  docName: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
}

export interface DraftHistoryItem {
  id: string;
  title: string;
  mode: DraftMode;
  prompt: string;
  output: string;
  provider: AIProvider;
  profileName?: string;
  model: string;
  timestamp: number;
  wordCount: number;
  sourcesUsed: string[];
}

export enum AIProvider {
  OPENAI_COMPATIBLE = 'OPENAI_COMPATIBLE',
  GEMINI_DIRECT = 'GEMINI_DIRECT',
}

export interface OpenAIProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  envKeyName?: string;
  model: string;
  isPreset?: boolean;
  contextWindow?: number;
  customInstructions?: string;
  strictGrounding?: boolean;
}

export enum DraftMode {
  THESIS = 'THESIS',
  EXAM_MASTERY = 'EXAM_MASTERY',
  LIT_REVIEW = 'LIT_REVIEW',
  CUSTOM = 'CUSTOM',
}

export interface DraftingState {
  isGenerating: boolean;
  output: string;
  error: string | null;
  groundedPapers?: ScholarlyPaper[];
}

export interface ScholarlyPaper {
  id: string;
  title: string;
  authors: string[];
  year?: number | string;
  abstract?: string;
  doi?: string;
  url?: string;
  journal?: string;
  source: 'crossref' | 'arxiv' | 'semanticscholar';
  citationCount?: number;
}

export enum AcademicSkillType {
  LITERATURE_DISCOVERY = 'LITERATURE_DISCOVERY',
  CITATION_GROUNDING = 'CITATION_GROUNDING',
  COUNTERARGUMENT_FINDER = 'COUNTERARGUMENT_FINDER',
  METHODOLOGY_FINDER = 'METHODOLOGY_FINDER',
}

export interface AgenticSkillResult {
  skill: AcademicSkillType;
  query: string;
  papers: ScholarlyPaper[];
  summary: string;
  timestamp: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: string[];
  modelUsed?: string;
  providerUsed?: AIProvider;
}

export interface AppConfig {
  aiProvider: AIProvider;
  activeProfileId: string;
  profiles: OpenAIProfile[];
  geminiApiKey: string;
  geminiModel: string;
  customSystemPrompt: string;
  webAccessEnabled: boolean;
  forceSmartRetrieval?: boolean;
  strictGrounding?: boolean;
}

export const DEFAULT_OPENAI_PROFILES: OpenAIProfile[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    envKeyName: 'DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
    contextWindow: 64000,
    isPreset: true,
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: '',
    envKeyName: 'GROQ_API_KEY',
    model: 'llama-3.3-70b-versatile',
    contextWindow: 128000,
    isPreset: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    envKeyName: 'OPENROUTER_API_KEY',
    model: 'google/gemini-2.0-flash-001',
    contextWindow: 128000,
    isPreset: true,
  },
  {
    id: 'ollama',
    name: 'Ollama Local',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    envKeyName: 'OLLAMA_API_KEY',
    model: 'llama3',
    contextWindow: 8192,
    isPreset: true,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio / Local Server',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: 'not-needed',
    model: 'local-model',
    contextWindow: 8192,
    isPreset: true,
  },
  {
    id: 'openai',
    name: 'OpenAI Official',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    envKeyName: 'OPENAI_API_KEY',
    model: 'gpt-4o',
    contextWindow: 128000,
    isPreset: true,
  },
];

export const DEFAULT_SYSTEM_PROMPT = `You are the "TomGees-Scholar-Studio" Advanced Intelligence Engine. 
Your mission is to provide graduate-level scholarship and rigorous exam preparation assistance. 
You function as a Senior Academic Scholar, Principal Investigator, and Graduate Examiner.
Always prioritize the Context Vault (user provided files) over general knowledge.
Output must be structured Markdown with tables and clear rubrics.`;
