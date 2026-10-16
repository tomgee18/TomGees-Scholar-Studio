export interface TokenBudget {
  estimatedTokens: number;
  injectedTokens: number;
  rawVaultTokens: number;
  maxContextTokens: number;
  usagePercentage: number;
  status: 'safe' | 'warning' | 'critical';
  isRAGActive: boolean;
  canSwitchToGemini: boolean;
  optimalChunkCount: number;
}

/**
 * Fast character & word heuristic token estimator.
 * 1 token ~= 3.8 characters for standard English prose and code.
 */
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
};

export const getModelContextLimit = (modelName: string, overrideLimit?: number): number => {
  if (typeof overrideLimit === 'number' && overrideLimit > 0) {
    return overrideLimit;
  }

  const name = modelName.toLowerCase();

  // Gemini models (1 Million tokens)
  if (
    name.includes('gemini-2.0') ||
    name.includes('gemini-2.5') ||
    name.includes('gemini-1.5') ||
    name.includes('gemini-3')
  ) {
    return 1000000;
  }
  if (name.includes('gemini')) return 128000;

  // Claude models (200k)
  if (name.includes('claude-3') || name.includes('claude-4') || name.includes('sonnet') || name.includes('opus')) {
    return 200000;
  }

  // OpenAI frontier models (128k)
  if (
    name.includes('gpt-4o') ||
    name.includes('gpt-4.1') ||
    name.includes('gpt-4-turbo') ||
    name.includes('o1') ||
    name.includes('o3') ||
    name.includes('o4')
  ) {
    return 128000;
  }

  // Llama 3.1 / 3.2 / 3.3 (128k)
  if (
    name.includes('llama-3.1') ||
    name.includes('llama-3.2') ||
    name.includes('llama-3.3') ||
    name.includes('llama3.1') ||
    name.includes('llama3.2') ||
    name.includes('llama3.3')
  ) {
    return 128000;
  }
  if (name.includes('llama-3') || name.includes('llama3')) return 8192;

  // Mistral / Qwen
  if (name.includes('qwen')) return 32768;
  if (name.includes('mistral') || name.includes('mixtral')) return 32768;

  // DeepSeek (64k context window)
  if (name.includes('deepseek')) return 64000;

  // Default conservative local context window
  return 8192;
};

/**
 * Dynamic model-aware chunk count calculation.
 * Ensures large models (64k, 128k, 1M) extract comprehensive multi-document context,
 * while compact models (4k, 8k) reserve safe headroom for output generation.
 */
export const getOptimalChunkCount = (maxContextTokens: number): number => {
  if (maxContextTokens >= 500000) return 80; // ~40,000 tokens (Gemini 1M)
  if (maxContextTokens >= 128000) return 50; // ~25,000 tokens (GPT-4o / Llama 3.3 / Claude)
  if (maxContextTokens >= 64000) return 32;  // ~16,000 tokens (DeepSeek 64k)
  if (maxContextTokens >= 32000) return 22;  // ~11,000 tokens (Qwen / Mistral)
  if (maxContextTokens >= 16000) return 14;  // ~7,000 tokens
  if (maxContextTokens >= 8000) return 8;    // ~4,000 tokens (8k local models)
  return 4;                                  // ~2,000 tokens (compact 4k models)
};

export const calculateTokenBudget = (
  systemPrompt: string,
  vaultText: string,
  userPrompt: string,
  modelName: string,
  forceRAG = false,
  overrideLimit?: number
): TokenBudget => {
  const maxContextTokens = getModelContextLimit(modelName, overrideLimit);
  const rawVaultTokens = estimateTokens(vaultText);
  const baseTokens = estimateTokens(`${systemPrompt}\n${userPrompt}`);

  // Headroom reservation: reserve ~2,048 tokens (or 25% of window for tight models) for generated output
  const reservedOutputTokens = Math.min(2048, Math.max(512, Math.floor(maxContextTokens * 0.25)));
  const availableInputBudget = Math.max(512, maxContextTokens - reservedOutputTokens);

  const optimalChunkCount = getOptimalChunkCount(maxContextTokens);

  // Pass 100% full Vault text automatically whenever it fits within 75% of the available input budget (unless forceRAG is enabled)
  const fullTextCeiling = Math.floor(availableInputBudget * 0.75);
  const isRAGActive = forceRAG || (baseTokens + rawVaultTokens) > fullTextCeiling;

  // Each chunk is ~380 words (~500 tokens)
  const maxAllowedRAGTokens = Math.max(0, availableInputBudget - baseTokens);
  const estimatedRAGTokens = Math.min(optimalChunkCount * 500, maxAllowedRAGTokens);

  const injectedTokens = isRAGActive
    ? Math.min(rawVaultTokens, baseTokens + estimatedRAGTokens)
    : baseTokens + rawVaultTokens;

  const usagePercentage = Math.min(100, Math.round((injectedTokens / maxContextTokens) * 100));

  let status: 'safe' | 'warning' | 'critical' = 'safe';
  if (usagePercentage > 85) {
    status = 'critical';
  } else if (usagePercentage > 60) {
    status = 'warning';
  }

  // Can switch to Gemini 2.5 Flash if not already using Gemini and vault exceeds current model limit
  const isAlreadyGemini = modelName.toLowerCase().includes('gemini');
  const canSwitchToGemini = !isAlreadyGemini && rawVaultTokens > maxContextTokens;

  return {
    estimatedTokens: injectedTokens,
    injectedTokens,
    rawVaultTokens,
    maxContextTokens,
    usagePercentage,
    status,
    isRAGActive,
    canSwitchToGemini,
    optimalChunkCount,
  };
};
