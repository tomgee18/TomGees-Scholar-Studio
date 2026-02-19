
import { OllamaModel } from '../../types';

export interface OllamaParams {
  endpoint: string;
  model: string;
  prompt: string;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

/**
 * Fetches raw model objects from Ollama tags endpoint.
 * Returns an empty array if fetching fails (e.g., Ollama is not running or CORS is blocked).
 */
export const getOllamaModels = async (endpoint: string) => {
  if (!endpoint) return [];
  const cleanEndpoint = endpoint.replace(/\/$/, "");
  try {
    const response = await fetch(`${cleanEndpoint}/api/tags`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error("Failed to fetch models");
    const data = await response.json();
    return data.models || []; // Returns an array of model objects
  } catch (error) {
    // Fail silently to avoid console spam during polling
    return [];
  }
};

/**
 * Fetches a list of installed models with details from the Ollama instance.
 */
export const listOllamaModels = async (endpoint: string): Promise<OllamaModel[]> => {
  const models = await getOllamaModels(endpoint);
  return models as OllamaModel[];
};

/**
 * Streams generation from Ollama /api/generate endpoint
 */
export const generateOllama = async ({ endpoint, model, prompt, onChunk, signal }: OllamaParams) => {
  const cleanEndpoint = endpoint.replace(/\/$/, "");
  
  try {
    const response = await fetch(`${cleanEndpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { num_predict: 4096 }
      }),
      signal
    });

    if (!response.ok) throw new Error(`Ollama API Error: ${response.statusText}`);
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) onChunk(json.response);
          if (json.done) return;
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      }
    }
  } catch (error: any) {
    if (signal?.aborted || error.name === 'AbortError') return;
    console.error("Ollama Stream Error:", error);
    throw error;
  }
};
