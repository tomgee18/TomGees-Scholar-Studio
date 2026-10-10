import { describe, it, expect, vi } from 'vitest';
import { routeAIRequest } from './aiRouter';
import { AIProvider, OpenAIProfile } from '../../types';

// Mock the direct providers
vi.mock('./openAICompatibleProvider', () => ({
  generateOpenAICompatible: vi.fn().mockImplementation(async ({ messages, onChunk }) => {
    onChunk('mock response for ' + messages.length + ' messages');
  }),
}));

vi.mock('./geminiProvider', () => ({
  generateGeminiDirect: vi.fn().mockImplementation(async ({ messages, onChunk }) => {
    onChunk('gemini response for ' + (messages?.length || 0) + ' messages');
  }),
}));

describe('routeAIRequest Multi-Turn AI Router', () => {
  it('routes single-turn prompt to OpenAI-compatible provider with system and user roles', async () => {
    let output = '';
    const profile: OpenAIProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      baseUrl: 'https://api.test.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    };

    await routeAIRequest({
      provider: AIProvider.OPENAI_COMPATIBLE,
      activeProfile: profile,
      systemPrompt: 'System instruction',
      userPrompt: 'User inquiry',
      config: { geminiApiKey: '', geminiModel: '' },
      onChunk: (chunk) => {
        output += chunk;
      },
    });

    expect(output).toContain('mock response for 2 messages');
  });

  it('routes multi-turn message history to Gemini Direct provider', async () => {
    let output = '';
    await routeAIRequest({
      provider: AIProvider.GEMINI_DIRECT,
      messages: [
        { role: 'system', content: 'Academic assistant' },
        { role: 'user', content: 'Turn 1' },
        { role: 'assistant', content: 'Answer 1' },
        { role: 'user', content: 'Turn 2' },
      ],
      config: { geminiApiKey: 'mock-key', geminiModel: 'gemini-2.5-flash' },
      onChunk: (chunk) => {
        output += chunk;
      },
    });

    expect(output).toContain('gemini response for 4 messages');
  });

  it('throws an error if OpenAI compatible profile is missing', async () => {
    await expect(
      routeAIRequest({
        provider: AIProvider.OPENAI_COMPATIBLE,
        activeProfile: undefined,
        userPrompt: 'Test',
        config: { geminiApiKey: '', geminiModel: '' },
        onChunk: () => {},
      })
    ).rejects.toThrow('No active OpenAI profile configured');
  });
});
