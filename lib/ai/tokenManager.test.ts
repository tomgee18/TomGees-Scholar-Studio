import { describe, it, expect } from 'vitest';
import { estimateTokens, calculateTokenBudget, getModelContextLimit } from './tokenManager';

describe('tokenManager', () => {
  it('estimates tokens based on text length', () => {
    const text = 'This is a sample sentence for tokenization estimation.';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(Math.ceil(text.length / 3.8));
  });

  it('resolves correct model limits', () => {
    expect(getModelContextLimit('gemini-2.0-flash')).toBe(1000000);
    expect(getModelContextLimit('claude-3-opus')).toBe(200000);
    expect(getModelContextLimit('llama3:latest')).toBe(8192);
  });

  it('calculates token budget status correctly', () => {
    const budget = calculateTokenBudget(
      'System prompt instructions',
      'Vault document source content here',
      'Research objective',
      'llama3'
    );

    expect(budget.estimatedTokens).toBeGreaterThan(0);
    expect(budget.maxContextTokens).toBe(8192);
    expect(budget.status).toBe('safe');
  });
});
