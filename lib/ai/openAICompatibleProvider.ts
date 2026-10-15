export interface OpenAICompatibleParams {
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export interface DiscoveredModel {
  id: string;
  name?: string;
  context_length?: number;
}

/**
 * Normalizes baseUrl by trimming trailing slashes and ensuring no duplicated /v1
 */
export const normalizeBaseUrl = (url: string): string => {
  return url.replace(/\/+$/, '');
};

/**
 * Fetch available models from GET ${baseUrl}/models
 */
export const fetchModelsFromEndpoint = async (
  baseUrl: string,
  apiKey?: string
): Promise<DiscoveredModel[]> => {
  const cleanBase = normalizeBaseUrl(baseUrl);
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (apiKey && apiKey !== 'not-needed') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${cleanBase}/models`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (data && Array.isArray(data.data)) {
      return data.data.map((m: any) => ({
        id: m.id || m.name,
        name: m.name || m.id,
        context_length: m.context_length,
      }));
    } else if (data && Array.isArray(data.models)) {
      // Handles Ollama native style if mapped to /v1
      return data.models.map((m: any) => ({
        id: m.name || m.id,
        name: m.name || m.id,
      }));
    }

    return [];
  } catch (error) {
    console.warn(`Failed to fetch models from ${cleanBase}/models:`, error);
    return [];
  }
};

/**
 * Universal OpenAI Chat Completions SSE streaming client.
 * Connects to any standard POST ${baseUrl}/chat/completions endpoint.
 */
export const generateOpenAICompatible = async ({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  onChunk,
  signal,
}: OpenAICompatibleParams): Promise<void> => {
  const cleanBase = normalizeBaseUrl(baseUrl);
  const targetUrl = `${cleanBase}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey !== 'not-needed') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // OpenRouter headers if targeting OpenRouter
  if (cleanBase.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    headers['X-Title'] = 'TomGees Scholar Studio';
  }

  const MAX_RETRIES = 2;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const requestPayload: Record<string, any> = {
        model: model || 'gpt-4o',
        messages,
        stream: true,
      };

      if (typeof temperature === 'number') {
        requestPayload.temperature = temperature;
      }

      if (typeof maxTokens === 'number' && maxTokens > 0) {
        requestPayload.max_tokens = maxTokens;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        signal,
      });

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;
          continue;
        } else {
          throw new Error('Rate limit exceeded (429). The model provider is busy or credits exhausted.');
        }
      }

      if (!response.ok) {
        let errorDetails = response.statusText;
        try {
          const errJson = await response.json();
          errorDetails = errJson.error?.message || errJson.message || errorDetails;
        } catch {
          // ignore parsing error
        }
        throw new Error(`Inference Error (${response.status}): ${errorDetails}`);
      }

      if (!response.body) {
        throw new Error('No readable response body received from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // SSE format: data: {...}
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') return;

            try {
              const parsed = JSON.parse(dataStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                onChunk(deltaContent);
              }
            } catch {
              // Ignore partial JSON chunk
            }
          }
        }
      }

      return;
    } catch (err: any) {
      if (signal?.aborted || err.name === 'AbortError') return;
      throw err;
    }
  }
};
