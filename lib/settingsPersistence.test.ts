import { describe, it, expect } from 'vitest';
import { db } from './db';
import { DEFAULT_OPENAI_PROFILES, OpenAIProfile, AppConfig, AIProvider, DEFAULT_SYSTEM_PROMPT } from '../types';

describe('Settings & Profile Persistence Engine', () => {
  it('has settings table properly registered in Dexie schema', () => {
    expect(db.settings).toBeDefined();
    expect(db.settings.name).toBe('settings');
    expect(db.tables.some((t) => t.name === 'settings')).toBe(true);
  });

  it('losslessly serializes and deserializes custom profiles in configuration payload', () => {
    const customProfile: OpenAIProfile = {
      id: 'custom-vllm-cluster',
      name: 'Local vLLM Server',
      baseUrl: 'http://192.168.1.100:8000/v1',
      apiKey: 'sk-custom-cluster-key',
      model: 'mistralai/Mistral-7B-Instruct-v0.3',
      isPreset: false,
    };

    const config: AppConfig = {
      aiProvider: AIProvider.OPENAI_COMPATIBLE,
      activeProfileId: customProfile.id,
      profiles: [...DEFAULT_OPENAI_PROFILES, customProfile],
      geminiApiKey: 'custom-gemini-key',
      geminiModel: 'gemini-2.5-flash',
      customSystemPrompt: DEFAULT_SYSTEM_PROMPT,
      webAccessEnabled: true,
      forceSmartRetrieval: false,
    };

    const serialized = JSON.stringify(config);
    const parsed: AppConfig = JSON.parse(serialized);

    expect(parsed.activeProfileId).toBe('custom-vllm-cluster');
    const custom = parsed.profiles.find((p) => p.id === 'custom-vllm-cluster');
    expect(custom).toBeDefined();
    expect(custom?.name).toBe('Local vLLM Server');
    expect(custom?.baseUrl).toBe('http://192.168.1.100:8000/v1');
    expect(custom?.apiKey).toBe('sk-custom-cluster-key');
    expect(custom?.model).toBe('mistralai/Mistral-7B-Instruct-v0.3');
    expect(custom?.isPreset).toBe(false);
  });

  it('reconciles stored profiles without erasing custom endpoints when merging defaults', () => {
    const customProfile: OpenAIProfile = {
      id: 'custom-ollama-remote',
      name: 'Lab Server Ollama',
      baseUrl: 'http://10.0.0.50:11434/v1',
      apiKey: '',
      model: 'qwen2.5:14b',
      isPreset: false,
    };

    const savedProfiles: Array<Partial<OpenAIProfile> & { id: string }> = [
      { id: 'deepseek', apiKey: 'sk-deepseek-custom', model: 'deepseek-reasoner' },
      customProfile,
    ];

    // Simulating hydration logic from ContextStore
    const defaultMerged = DEFAULT_OPENAI_PROFILES.map((defaultP) => {
      const savedP = savedProfiles.find((p) => p.id === defaultP.id);
      return {
        ...defaultP,
        ...(savedP || {}),
      };
    });

    const customProfiles = savedProfiles.filter(
      (p) => !DEFAULT_OPENAI_PROFILES.some((d) => d.id === p.id)
    );

    const merged = [...defaultMerged, ...customProfiles];

    expect(merged.length).toBe(DEFAULT_OPENAI_PROFILES.length + 1);
    const deepseek = merged.find((p) => p.id === 'deepseek');
    expect(deepseek?.apiKey).toBe('sk-deepseek-custom');
    expect(deepseek?.model).toBe('deepseek-reasoner');

    const custom = merged.find((p) => p.id === 'custom-ollama-remote') as OpenAIProfile | undefined;
    expect(custom).toBeDefined();
    expect(custom?.name).toBe('Lab Server Ollama');
    expect(custom?.baseUrl).toBe('http://10.0.0.50:11434/v1');
    expect(custom?.model).toBe('qwen2.5:14b');
  });

  it('handles custom profile deletion while safely retaining active preset', () => {
    const custom1: OpenAIProfile = {
      id: 'custom-1',
      name: 'Endpoint 1',
      baseUrl: 'http://localhost:8000/v1',
      apiKey: '',
      model: 'test-model',
      isPreset: false,
    };

    const profiles = [...DEFAULT_OPENAI_PROFILES, custom1];
    const filtered = profiles.filter((p) => p.id !== 'custom-1');

    expect(filtered.length).toBe(DEFAULT_OPENAI_PROFILES.length);
    expect(filtered.some((p) => p.id === 'custom-1')).toBe(false);
    expect(filtered.some((p) => p.id === 'deepseek')).toBe(true);
  });
});
