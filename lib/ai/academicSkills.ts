import {
  AcademicSkillType,
  AgenticSkillResult,
  AppConfig,
} from '../../types';
import { searchScholarlyLiterature, formatPapersForContext } from './scholarlyClient';
import { sendAIMessage } from './aiRouter';

export interface SkillDefinition {
  type: AcademicSkillType;
  title: string;
  description: string;
  badge: string;
  iconName: string;
  promptTemplate: (topic: string, contextSummary?: string) => string;
}

export const ACADEMIC_SKILLS: Record<AcademicSkillType, SkillDefinition> = {
  [AcademicSkillType.LITERATURE_DISCOVERY]: {
    type: AcademicSkillType.LITERATURE_DISCOVERY,
    title: 'Literature Discovery',
    description: 'Find foundational & cutting-edge peer-reviewed papers with authentic DOIs.',
    badge: 'Discovery',
    iconName: 'BookSearch',
    promptTemplate: (topic, context) => `
Analyze this research topic: "${topic}".
${context ? `Active Draft Context: "${context.slice(0, 1000)}"` : ''}

Synthesize a Literature Review briefing based on the retrieved scholarly papers:
1. Core Theoretical Foundations & Key Findings.
2. State-of-the-Art Advances & Methodological Trends.
3. Identified Research Gaps your thesis can address.
4. Formatted Bibliography with clickable DOIs.
`,
  },
  [AcademicSkillType.CITATION_GROUNDING]: {
    type: AcademicSkillType.CITATION_GROUNDING,
    title: 'Citation & DOI Grounding',
    description: 'Ground claims with authentic citations and verified DOI hyperlinks.',
    badge: 'Verification',
    iconName: 'CheckCircle2',
    promptTemplate: (topic, context) => `
Examine the following thesis claims or text:
Topic / Claims: "${topic}"
${context ? `Draft Text: "${context.slice(0, 1500)}"` : ''}

Using the verified academic literature retrieved below:
1. Identify claims requiring empirical support.
2. Match each claim with a specific retrieved paper (citing author, year, and DOI).
3. Provide model revised sentences with seamless inline citations.
4. Provide the exact APA / IEEE bibliographic references.
`,
  },
  [AcademicSkillType.COUNTERARGUMENT_FINDER]: {
    type: AcademicSkillType.COUNTERARGUMENT_FINDER,
    title: 'Counterarguments & Critique',
    description: 'Uncover dissenting findings and critiques to fortify thesis defense.',
    badge: 'Defense',
    iconName: 'ShieldAlert',
    promptTemplate: (topic, context) => `
Examine this central thesis argument: "${topic}".
${context ? `Supporting Arguments: "${context.slice(0, 1000)}"` : ''}

Based on the retrieved scholarly literature:
1. Identify primary counterarguments, contradictory empirical findings, or theoretical critiques.
2. Analyze the methodological boundaries or edge cases where this thesis might fail.
3. Provide defense strategies & nuanced counter-rebuttals to strengthen the thesis.
4. Cite supporting dissenting literature with full DOIs.
`,
  },
  [AcademicSkillType.METHODOLOGY_FINDER]: {
    type: AcademicSkillType.METHODOLOGY_FINDER,
    title: 'Methodology & Benchmark Audit',
    description: 'Discover standard empirical frameworks, baselines, and datasets.',
    badge: 'Empirical',
    iconName: 'Cpu',
    promptTemplate: (topic, context) => `
Examine the research scope: "${topic}".
${context ? `Proposed Methodology: "${context.slice(0, 1000)}"` : ''}

Based on the retrieved scholarly literature:
1. Catalog standard empirical designs, experimental protocols, or mathematical frameworks.
2. Identify benchmark datasets, evaluation metrics, and baselines used in peer-reviewed works.
3. Highlight common methodological pitfalls or threats to validity.
4. Cite the benchmark papers with DOIs.
`,
  },
};

/**
 * Executes an Agentic Academic Skill:
 * 1. Formulates search keywords from user intent
 * 2. Fetches open academic papers concurrently from Crossref, arXiv, and Semantic Scholar
 * 3. Injects retrieved papers into the AI model to produce grounded scholarly analysis
 */
export const executeAcademicSkill = async (
  skillType: AcademicSkillType,
  queryOrTopic: string,
  config: AppConfig,
  activeDraftSnippet?: string,
  onStatusUpdate?: (status: string) => void
): Promise<AgenticSkillResult> => {
  const skill = ACADEMIC_SKILLS[skillType];
  if (!skill) {
    throw new Error(`Unknown academic skill type: ${skillType}`);
  }

  onStatusUpdate?.(`Searching Crossref, arXiv & Semantic Scholar for "${queryOrTopic.slice(0, 40)}..."`);

  // Step 1: Open Academic Retrieval
  const papers = await searchScholarlyLiterature(queryOrTopic, 5);

  onStatusUpdate?.(`Retrieved ${papers.length} scholarly papers. Synthesizing ${skill.title}...`);

  // Step 2: Build Evidence Payload
  const evidenceBlock = formatPapersForContext(papers);
  const userPrompt = skill.promptTemplate(queryOrTopic, activeDraftSnippet);

  const fullPrompt = `
${userPrompt}

${evidenceBlock}
`;

  // Step 3: Run AI Synthesis with active provider
  const response = await sendAIMessage(
    [
      {
        role: 'system',
        content: `You are an elite Academic Research Investigator and Dissertation Advisor. 
Provide rigorous, graduate-level analysis based strictly on authentic scholarly evidence.
Always cite authors, years, and real DOIs provided in the retrieved evidence block.`,
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ],
    config
  );

  return {
    skill: skillType,
    query: queryOrTopic,
    papers,
    summary: response,
    timestamp: Date.now(),
  };
};
