
export interface OpenRouterParams {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export const generateOpenRouter = async ({
  apiKey,
  model,
  messages,
  onChunk,
  signal
}: OpenRouterParams): Promise<void> => {
  if (!apiKey) {
    throw new Error("OpenRouter API Key is missing. Check Settings.");
  }

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000", 
          "X-Title": "TomGees Scholar Studio",
        },
        body: JSON.stringify({
          model: model || "google/gemini-2.0-flash-001", 
          messages: messages,
          stream: true
        }),
        signal
      });

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000 + (Math.random() * 1000);
          console.warn(`OpenRouter 429 (Rate Limit). Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        } else {
           // Provide a specific, helpful message for 429s after retries fail
           throw new Error("Rate limit exceeded (429). The AI model is currently busy or you have run out of credits. Please try a different model (e.g., a non-free one) or wait a moment.");
        }
      }

      if (!response.ok) {
        let errorMessage = "OpenRouter Request Failed";
        try {
            const err = await response.json();
            errorMessage = err.error?.message || errorMessage;
        } catch (e) {
            // ignore
        }
        throw new Error(`Cloud Error: ${response.status} - ${errorMessage}`);
      }

      if (!response.body) throw new Error("No response body from OpenRouter.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split("\n");
        // If buffer ends with \n, pop returns empty string (correct).
        // If buffer doesn't end with \n, pop returns incomplete line (correct).
        buffer = lines.pop() || ""; 

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          if (!data) continue; // Skip empty data lines (keep-alives)

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.warn("Error parsing OpenRouter stream chunk:", e);
          }
        }
      }
      return; // Success

    } catch (error: any) {
      if (signal?.aborted || error.name === 'AbortError') return; 
      
      // If the error was thrown by us (above), rethrow it.
      // If it's a network error during fetch (not status code), we could retry, but for now we throw.
      throw error;
    }
  }
};
