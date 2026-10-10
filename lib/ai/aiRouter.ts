import { AIProvider, OpenAIProfile } from '../../types';
import { generateOpenAICompatible } from './openAICompatibleProvider';
import { generateGeminiDirect } from './geminiProvider';

interface RouterParams {
  provider: AIProvider;
  activeProfile?: OpenAIProfile;
  systemPrompt: string;
  userPrompt: string;
  config: {
    geminiApiKey: string;
    geminiModel: string;
  };
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export const routeAIRequest = async (params: RouterParams) => {
  const { provider, activeProfile, systemPrompt, userPrompt, config, onChunk, signal } = params;

  if (provider === AIProvider.GEMINI_DIRECT) {
    await generateGeminiDirect({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      systemInstruction: systemPrompt,
      prompt: userPrompt,
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
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      onChunk,
      signal,
    });
  } else {
    throw new Error(`Invalid AI Provider: ${provider}`);
  }
};