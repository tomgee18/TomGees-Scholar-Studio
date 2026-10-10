import { AIProvider, OpenAIProfile, AIMessage } from '../../types';
import { generateOpenAICompatible } from './openAICompatibleProvider';
import { generateGeminiDirect } from './geminiProvider';

interface RouterParams {
  provider: AIProvider;
  activeProfile?: OpenAIProfile;
  systemPrompt?: string;
  userPrompt?: string;
  messages?: AIMessage[];
  config: {
    geminiApiKey: string;
    geminiModel: string;
  };
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export const routeAIRequest = async (params: RouterParams) => {
  const { provider, activeProfile, systemPrompt, userPrompt, messages, config, onChunk, signal } = params;

  const resolvedMessages: AIMessage[] = messages
    ? messages
    : [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...(userPrompt ? [{ role: 'user' as const, content: userPrompt }] : []),
      ];

  if (provider === AIProvider.GEMINI_DIRECT) {
    await generateGeminiDirect({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      messages: resolvedMessages,
      onChunk,
      signal,
    });
  } else if (provider === AIProvider.OPENAI_COMPATIBLE) {
    if (!activeProfile) {
      throw new Error('No active OpenAI profile configured. Check Settings.');
    }

    await generateOpenAICompatible({
      baseUrl: activeProfile.baseUrl,
      apiKey: activeProfile.apiKey,
      model: activeProfile.model,
      messages: resolvedMessages,
      onChunk,
      signal,
    });
  } else {
    throw new Error(`Invalid AI Provider: ${provider}`);
  }
};