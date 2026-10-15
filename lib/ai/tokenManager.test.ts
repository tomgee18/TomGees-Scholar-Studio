import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  calculateTokenBudget,
  getModelContextLimit,
  getOptimalChunkCount,
} from './tokenManager';

describe('tokenManager', () => {
  it('estimates tokens based on text length', () => {
    const text = 'This is a sample sentence for tokenization estimation.';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(Math.ceil(text.length / 3.8));
  });

  it('resolves correct model limits', () => {
    expect(getModelContextLimit('gemini-2.5-flash')).toBe(1000000);
    expect(getModelContextLimit('claude-3-opus')).toBe(200000);
    expect(getModelContextLimit('deepseek-chat')).toBe(64000);
    expect(getModelContextLimit('llama3:latest')).toBe(8192);
  });

  it('respects user-configured context window override limit', () => {
    // Override a 64k model to 8k (e.g. on a low-memory local router)
    expect(getModelContextLimit('deepseek-chat', 8192)).toBe(8192);
    expect(getModelContextLimit('gpt-4o', 16384)).toBe(16384);
    expect(getModelContextLimit('llama3', 4096)).toBe(4096);
  });

  it('calculates optimal chunk counts scaled by context limit', () => {
    expect(getOptimalChunkCount(1000000)).toBe(40);
    expect(getOptimalChunkCount(64000)).toBe(25);
    expect(getOptimalChunkCount(32768)).toBe(18);
    expect(getOptimalChunkCount(16384)).toBe(14);
    expect(getOptimalChunkCount(8192)).toBe(8);
    expect(getOptimalChunkCount(4096)).toBe(4);
  });

  it('reserves safe output generation headroom on an 8k context window', () => {
    const vaultText = 'Lecture notes on artificial intelligence. '.repeat(1000); // ~9,000 tokens
    const budget = calculateTokenBudget(
      'System prompt instructions',
      vaultText,
      'Prepare summary',
      'llama3',
      false,
      8192
    );

    expect(budget.maxContextTokens).toBe(8192);
    expect(budget.isRAGActive).toBe(true);
    expect(budget.optimalChunkCount).toBe(8);
    // 8 chunks (~4,240 tokens) + base prompt leaves > 2,000 tokens headroom for generation
    expect(budget.injectedTokens).toBeLessThan(6000);
    expect(budget.status).toBe('safe');
  });

  it('handles 125k token course material safely via BM25 retrieval against a 64k model', () => {
    // Generate ~125,000 tokens worth of text (~475,000 characters)
    const massiveVaultText = 'Theoretical physics and quantum mechanics course notes. '.repeat(8500);
    const estimatedVaultTokens = estimateTokens(massiveVaultText);
    expect(estimatedVaultTokens).toBeGreaterThan(120000);

    const budget = calculateTokenBudget(
      'System prompt instructions',
      massiveVaultText,
      'Prepare high-yield exam guide',
      'deepseek-chat'
    );

    expect(budget.maxContextTokens).toBe(64000);
    expect(budget.isRAGActive).toBe(true);
    expect(budget.canSwitchToGemini).toBe(true);
    expect(budget.optimalChunkCount).toBe(25);
    // Injected tokens must be safe (~14k tokens) and NOT overflow the 64k limit
    expect(budget.injectedTokens).toBeLessThan(20000);
    expect(budget.status).toBe('safe');
  });
});
