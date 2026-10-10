export interface TokenBudget {
  estimatedTokens: number;
  maxContextTokens: number;
  usagePercentage: number;
  status: 'safe' | 'warning' | 'critical';
}

/**
 * Fast character & word heuristic token estimator.
 * 1 token ~= 4 characters or 0.75 words for standard English.
 */
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
};

export const getModelContextLimit = (modelName: string): number => {
  const name = modelName.toLowerCase();

  // Gemini models
  if (name.includes('gemini-2.0') || name.includes('gemini-1.5')) return 1000000;
  if (name.includes('gemini')) return 128000;

  // Claude models
  if (name.includes('claude-3')) return 200000;

  // Llama 3 / 3.1 / 3.2
  if (name.includes('llama-3.1') || name.includes('llama-3.2') || name.includes('llama-3.3')) return 128000;
  if (name.includes('llama-3') || name.includes('llama3')) return 8192;

  // Mistral / Qwen
  if (name.includes('qwen-2.5') || name.includes('qwen2.5')) return 32768;
  if (name.includes('mistral')) return 32768;
  if (name.includes('deepseek')) return 64000;

  // Default conservative local context window
  return 8192;
};

export const calculateTokenBudget = (
  systemPrompt: string,
  vaultText: string,
  userPrompt: string,
  modelName: string
): TokenBudget => {
  const totalText = `${systemPrompt}\n${vaultText}\n${userPrompt}`;
  const estimatedTokens = estimateTokens(totalText);
  const maxContextTokens = getModelContextLimit(modelName);
  const usagePercentage = Math.min(100, Math.round((estimatedTokens / maxContextTokens) * 100));

  let status: 'safe' | 'warning' | 'critical' = 'safe';
  if (usagePercentage > 85) {
    status = 'critical';
  } else if (usagePercentage > 60) {
    status = 'warning';
  }

  return {
    estimatedTokens,
    maxContextTokens,
    usagePercentage,
    status,
  };
};
