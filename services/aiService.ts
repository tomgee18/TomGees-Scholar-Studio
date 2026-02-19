// DEPRECATED: This file is kept for backward compatibility.
// Please use /lib/ai/draftEngine.ts and /lib/ai/aiRouter.ts for new features.

import { runDraftEngine } from '../lib/ai/draftEngine';
import { DraftMode } from '../types';

export const generateDraftStream = async (params: any) => {
  // Bridge old API calls to new Draft Engine
  // Defaulting to Custom Mode if old API is used
  return runDraftEngine({
    mode: DraftMode.CUSTOM,
    userDirective: params.task,
    contextData: params.context,
    config: {
        provider: params.provider,
        ollamaEndpoint: params.ollamaEndpoint,
        ollamaModel: params.ollamaModel,
        openRouterApiKey: params.openRouterApiKey || "",
        openRouterModel: params.openRouterModel || "",
        customSystemPrompt: "",
        webAccessEnabled: params.webAccessEnabled || false
    },
    onChunk: params.onChunk,
    signal: params.signal
  });
};