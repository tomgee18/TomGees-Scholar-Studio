import { AIProvider } from '../../types';
import { generateOllama } from './ollamaProvider';
import { generateOpenRouter } from './openRouterProvider';

interface RouterParams {
  provider: AIProvider;
  systemPrompt: string;
  userPrompt: string;
  config: {
    ollamaEndpoint: string;
    ollamaModel: string;
    openRouterApiKey: string;
    openRouterModel: string;
  };
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export const routeAIRequest = async (params: RouterParams) => {
  const { provider, systemPrompt, userPrompt, config, onChunk, signal } = params;

  if (provider === AIProvider.OPENROUTER_CLOUD) {
    // Cloud Logic
    await generateOpenRouter({
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      onChunk,
      signal
    });
  } else if (provider === AIProvider.OLLAMA_LOCAL) {
    // Local Logic - Combine system and user prompt for basic completion models if needed, 
    // but assuming chat/generate endpoint, we structure the prompt.
    const fullPrompt = `${systemPrompt}\n\nUSER DIRECTIVE:\n${userPrompt}`;
    
    await generateOllama({
      endpoint: config.ollamaEndpoint,
      model: config.ollamaModel,
      prompt: fullPrompt,
      onChunk,
      signal
    });
  } else {
    throw new Error("Invalid AI Provider");
  }
};