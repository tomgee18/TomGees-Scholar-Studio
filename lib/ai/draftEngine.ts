import { DraftMode, AIProvider, OpenAIProfile, ScholarlyPaper } from '../../types';
import { routeAIRequest } from './aiRouter';
import { searchScholarlyLiterature, formatPapersForContext } from './scholarlyClient';

interface EngineParams {
  mode: DraftMode;
  userDirective: string;
  contextData: string;
  config: {
    provider: AIProvider;
    activeProfile?: OpenAIProfile;
    geminiApiKey: string;
    geminiModel: string;
    customSystemPrompt: string;
    webAccessEnabled: boolean;
    strictGrounding?: boolean;
  };
  onChunk: (text: string) => void;
  onStatusUpdate?: (status: string) => void;
  onGroundedPapers?: (papers: ScholarlyPaper[]) => void;
  signal?: AbortSignal;
}

const THESIS_STRUCTURE = `
[STRICT ACADEMIC STRUCTURE REQUIRED]
1. Chapter 1: Introduction
   - Background of Study
   - Statement of Problem
   - Research Questions & Hypotheses
2. Chapter 2: Literature Review
   - Thematic synthesis of Vault context.
   - Comparative Markdown TABLES evaluating competing theoretical frameworks.
3. Chapter 3: Methodology
   - Research design, sampling, analytical instruments.
4. Chapter 4: Results & Discussion
   - Critical data presentation with formal academic argumentation.
5. Chapter 5: Conclusion & Recommendations
`;

const EXAM_MASTERY_STRUCTURE = `
[STRICT EXAM PREPARATION & MASTERY KIT]
Produce an exhaustive, graduate-level revision & examination suite:

1. SECTION 1: High-Yield Core Concept Synthesis
   - Summarize the top 20% most critical theorems, equations, models, or legal/empirical frameworks.
   - Use Markdown TABLES mapping: [Concept / Theorem | Key Mechanism | Exam Significance].

2. SECTION 2: Master Mock Examination
   - PART A: Conceptual Precision Questions (Short-answer, definitional testing).
   - PART B: Applied & Case-Based Analytical Problems (Complex scenarios requiring multi-step synthesis).
   - PART C: Comprehensive Essay / Long-Form Prompts (Challenging exam prompts testing synthesis).

3. SECTION 3: Official Marking Scheme & Exemplar Answers
   - Detailed point-by-point marking rubric (allocation of marks per step).
   - Exemplar top-tier model answers for every question above.

4. SECTION 4: Common Pitfalls & High-Frequency Exam Traps
   - Contrast subtle misconceptions that cost students top marks.
   - Table: [Common Student Mistake | Why It Loses Marks | Correct Interpretation].

5. SECTION 5: Active Recall Self-Testing Prompts
   - 10 targeted retrieval questions formulated for active recall revision.
`;

const LIT_REVIEW_STRUCTURE = `
[STRICT LITERATURE REVIEW & META-SYNTHESIS]
Synthesize the provided Context Vault literature into a rigorous, publication-ready review:

1. Theoretical Framework & Conceptual Foundations
   - Core paradigms and overarching epistemological traditions.
2. Thematic Matrix of Literature
   - MUST construct a comprehensive Markdown Comparison Matrix:
     | Author / Source | Core Methodology | Primary Finding | Limitations | Contribution |
3. Critical Methodological Review
   - Comparative strengths and vulnerabilities across studies.
4. Points of Scholarly Consensus vs. Empirical Contradictions
   - Where the literature aligns vs. contested debates.
5. Identified Gaps & Agenda for Future Research
   - Unanswered questions, blind spots, and proposed future directions.
`;

export const constructSystemPrompt = (
  customSystemPrompt: string,
  mode: DraftMode,
  webAccessEnabled: boolean,
  contextData: string,
  scholarlyEvidenceBlock?: string,
  strictGrounding?: boolean
): string => {
  const modeInstruction =
    mode === DraftMode.THESIS
      ? `MODE: THESIS & DISSERTATION. You are a PhD Research Advisor. Maintain rigorous academic prose and formal chapters.\n${THESIS_STRUCTURE}`
      : mode === DraftMode.EXAM_MASTERY
      ? `MODE: EXAM & MASTERY PREPARATION. You are a University Chief Examiner and Distinguished Professor. Produce a high-yield study and mock exam suite designed for maximum mastery.\n${EXAM_MASTERY_STRUCTURE}`
      : mode === DraftMode.LIT_REVIEW
      ? `MODE: LITERATURE REVIEW & META-SYNTHESIS. You are a Principal Research Fellow. Synthesize cross-paper consensus, methodological differences, and research gaps.\n${LIT_REVIEW_STRUCTURE}`
      : 'MODE: CUSTOM SCHOLAR DRAFTING. Follow user directives with meticulous precision while anchoring strictly in context.';

  let webInstruction = '';
  if (webAccessEnabled) {
    webInstruction = `
[OPEN SCHOLARSHIP & WEB GROUNDING: ACTIVE]
- Integrate the verified academic literature provided below from Crossref, arXiv, and Semantic Scholar.
- Cite authentic authors and publication years inline (e.g. Author et al., 2024).
- Hyperlink genuine DOIs (e.g. [DOI: 10.xxxx/...](https://doi.org/10.xxxx/...)) directly in the text and bibliography.
- Do NOT fabricate or hallucinate citations; use the verified sources provided.
`;
  }

  let strictGroundingInstruction = '';
  if (strictGrounding) {
    strictGroundingInstruction = `
[STRICT EVIDENTIARY GROUNDING: NO IMPLIED ANSWERS]
- Absolute Source Anchoring: Every concept, empirical finding, definition, equation, and claim must be explicitly grounded in the provided CONTEXT VAULT DATA.
- Zero Extrapolation / No Implied Answers: Do not guess, extrapolate, or inject external pre-trained assumptions as facts. If the vault data does not directly support a claim, do NOT imply an answer.
- Explicit Source Gaps: If a requested topic, section, or question is not covered in the provided materials, explicitly state: "[Source Gap: This concept is not covered in the provided vault materials]" rather than fabricating an explanation.
- Attribute Findings: Whenever discussing findings, explicitly cite the relevant source document or authors provided.
`;
  }

  return `
${customSystemPrompt}

${strictGroundingInstruction}

${modeInstruction}

${webInstruction}

${scholarlyEvidenceBlock || ''}

--- CONTEXT VAULT DATA ---
${contextData || 'No local documents provided. Rely on mode instructions, retrieved literature, and internal knowledge base.'}
--------------------------
`.trim();
};

export const runDraftEngine = async (params: EngineParams) => {
  const {
    mode,
    userDirective,
    contextData,
    config,
    onChunk,
    onStatusUpdate,
    onGroundedPapers,
    signal,
  } = params;

  let scholarlyEvidenceBlock = '';

  // When web grounding is enabled, perform live open academic retrieval
  if (config.webAccessEnabled) {
    try {
      onStatusUpdate?.('Querying Crossref, arXiv & Semantic Scholar for literature...');
      
      // Formulate a clean keyword query from userDirective
      const queryTerms = userDirective
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['generate', 'please', 'write', 'create', 'chapter', 'draft'].includes(w.toLowerCase()))
        .slice(0, 8)
        .join(' ');

      const query = queryTerms || userDirective.slice(0, 60);

      const groundedPapers = await searchScholarlyLiterature(query, 5);

      if (groundedPapers.length > 0) {
        onGroundedPapers?.(groundedPapers);
        scholarlyEvidenceBlock = formatPapersForContext(groundedPapers);
        onStatusUpdate?.(`Grounded with ${groundedPapers.length} verified academic papers. Synthesizing draft...`);
      } else {
        onStatusUpdate?.('No external matches found. Proceeding with Context Vault...');
      }
    } catch (err) {
      console.warn('Live scholarly retrieval failed, falling back to local vault:', err);
      onStatusUpdate?.('Scholarly retrieval timed out. Proceeding with local vault...');
    }
  }

  const isStrictGrounding =
    typeof config.strictGrounding === 'boolean'
      ? config.strictGrounding
      : typeof config.activeProfile?.strictGrounding === 'boolean'
      ? config.activeProfile.strictGrounding
      : false;

  const effectiveInstructions =
    config.activeProfile?.customInstructions?.trim() || config.customSystemPrompt;

  const finalSystemPrompt = constructSystemPrompt(
    effectiveInstructions,
    mode,
    config.webAccessEnabled,
    contextData,
    scholarlyEvidenceBlock,
    isStrictGrounding
  );

  const temperature = isStrictGrounding ? 0.15 : 0.7;

  await routeAIRequest({
    provider: config.provider,
    activeProfile: config.activeProfile,
    systemPrompt: finalSystemPrompt,
    userPrompt: userDirective,
    temperature,
    config: {
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
    },
    onChunk,
    signal,
  });
};
