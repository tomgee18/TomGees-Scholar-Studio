import { GoogleGenAI } from '@google/genai';

export interface GeminiParams {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  prompt?: string;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export interface GeminiDiscoveredModel {
  id: string;
  displayName: string;
}

/**
 * Live queries Google GenAI API to discover all models accessible to the user's API key.
 */
export const listAvailableGeminiModels = async (apiKey: string): Promise<GeminiDiscoveredModel[]> => {
  if (!apiKey) return [];
  try {
    const ai = new GoogleGenAI({ apiKey });
    const pager = await ai.models.list();
    const page = pager.page;

    if (!Array.isArray(page)) return [];

    return page
      .filter((m: any) => m.name && m.name.includes('gemini') && !m.name.includes('embedding') && !m.name.includes('tts'))
      .map((m: any) => ({
        id: m.name.replace(/^models\//, ''),
        displayName: m.displayName || m.name.replace(/^models\//, ''),
      }));
  } catch (err) {
    console.warn('Failed to query Gemini models:', err);
    return [];
  }
};

export const generateGeminiDirect = async ({
  apiKey,
  model,
  systemInstruction,
  prompt,
  messages,
  onChunk,
  signal,
}: GeminiParams): Promise<void> => {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please set GEMINI_API_KEY in your system environment or Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const targetModel = model || 'gemini-2.5-flash';

  try {
    let contentsPayload: any = prompt || '';
    let resolvedSystemInstruction = systemInstruction;

    if (messages && messages.length > 0) {
      const chatMessages = messages.filter((m) => {
        if (m.role === 'system') {
          resolvedSystemInstruction = (resolvedSystemInstruction ? resolvedSystemInstruction + '\n\n' : '') + m.content;
          return false;
        }
        return true;
      });

      contentsPayload = chatMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    }

    const responseStream = await ai.models.generateContentStream({
      model: targetModel,
      contents: contentsPayload,
      config: {
        systemInstruction: resolvedSystemInstruction || undefined,
      },
    });

    for await (const chunk of responseStream) {
      if (signal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error: any) {
    if (signal?.aborted) return;
    const msg = error?.message || 'Failed to generate content with Gemini';
    throw new Error(`Gemini Engine Error: ${msg}`, { cause: error });
  }
};
