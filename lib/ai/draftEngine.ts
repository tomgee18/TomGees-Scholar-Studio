
import { DraftMode, AIProvider } from '../../types';
import { routeAIRequest } from './aiRouter';

interface EngineParams {
  mode: DraftMode;
  userDirective: string;
  contextData: string;
  config: {
    provider: AIProvider;
    ollamaEndpoint: string;
    ollamaModel: string;
    openRouterApiKey: string;
    openRouterModel: string;
    customSystemPrompt: string;
    webAccessEnabled: boolean;
  };
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

const THESIS_STRUCTURE = `
[STRICT ACADEMIC STRUCTURE REQUIRED]
1. Chapter 1: Introduction
   - Background of Study
   - Statement of Problem
   - Research Objectives
2. Chapter 2: Literature Review
   - Synthesize provided context into thematic sections.
   - Use TABLES to compare different theories or studies if applicable.
3. Chapter 3: Methodology
4. Chapter 4: Results & Discussion
   - Present data/findings clearly.
5. Chapter 5: Conclusion
`;

const BUSINESS_STRUCTURE = `
[STRICT BUSINESS PLAN FORMAT]
1. Executive Summary
2. Company Description
3. Market Analysis (Include Competitor Comparison Table)
4. Operational Plan
5. Financial Projections
   - MUST use Markdown Tables for: Startup Costs, Revenue Forecast, Profit/Loss.
   - Use clear headers for all financial data.
6. SWOT Analysis
`;

export const runDraftEngine = async (params: EngineParams) => {
  const { mode, userDirective, contextData, config, onChunk, signal } = params;

  // 1. Construct System Identity
  let modeInstruction = "";
  if (mode === DraftMode.THESIS) {
    modeInstruction = `MODE: THESIS GENERATION. You are a PhD Research Assistant. Maintain rigorous academic tone. Synthesize context into formal chapters.\n${THESIS_STRUCTURE}`;
  } else if (mode === DraftMode.BUSINESS) {
    modeInstruction = `MODE: BUSINESS PLAN. You are a Corporate Strategist. Maintain investor-grade clarity. Focus on viability and financial structure.\n${BUSINESS_STRUCTURE}`;
  } else {
    modeInstruction = "MODE: CUSTOM DRAFTING. Follow user directives precisely while grounding in context.";
  }

  // 2. OER Augmentation Logic
  let webInstruction = "";
  if (config.webAccessEnabled) {
    webInstruction = `
[WEB ACCESS: ENABLED]
You have been granted access to Open Educational Resources (OER) logic.
- If your model architecture supports native web search (e.g., Perplexity, Gemini, Google Search), ACTIVELY SEARCH for recent academic papers, OER textbooks (OpenStax, MIT OCW), and reputable open-access journals to supplement the user's Context Vault.
- If you do not have native search, simulate this by prioritizing your internal knowledge base for "open access", "creative commons", and "public domain" educational content.
- CITATION REQUIREMENT: When using external OER knowledge, explicitly mention the source type (e.g., "Based on general open academic consensus...").
`;
  }

  // 3. Assemble Final System Prompt
  const finalSystemPrompt = `
${config.customSystemPrompt}

${modeInstruction}

${webInstruction}

--- CONTEXT VAULT DATA ---
${contextData || "No local documents provided. Rely on mode instructions and internal knowledge."}
--------------------------
`;

  // 4. Route Request
  await routeAIRequest({
    provider: config.provider,
    systemPrompt: finalSystemPrompt,
    userPrompt: userDirective,
    config: {
      ollamaEndpoint: config.ollamaEndpoint,
      ollamaModel: config.ollamaModel,
      openRouterApiKey: config.openRouterApiKey,
      openRouterModel: config.openRouterModel
    },
    onChunk,
    signal
  });
};
