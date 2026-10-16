import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  RefreshCw,
  Award,
  HelpCircle,
  Flame,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { PrimaryButton, GhostButton } from './ui/GlassComponents';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { useStore } from '../context/ContextStore';
import { routeAIRequest } from '../lib/ai/aiRouter';
import { extractExamQuestions } from '../lib/exportParser';
import { useToast } from '../context/ToastContext';

interface SocraticQuizPanelProps {
  studyContent: string;
  onGradingComplete?: (report: string) => void;
}

interface QuestionAttempt {
  question: string;
  userAnswer: string;
  feedback: string;
  score?: number;
  vivaPrompt?: string;
  vivaDefense: string;
  vivaFeedback: string;
}

const DEFAULT_FALLBACK_QUESTION =
  'Synthesize the primary thesis of the Vault documents and identify its core methodological limitation.';

const parseScoreFromFeedback = (feedbackText: string): number | undefined => {
  const match = feedbackText.match(/\b(\d{1,3})\s*\/\s*100\b/);
  if (!match) return undefined;
  const val = parseInt(match[1], 10);
  return val >= 0 && val <= 100 ? val : undefined;
};

export const SocraticQuizPanel = ({
  studyContent,
  onGradingComplete,
}: SocraticQuizPanelProps) => {
  const { config, activeProfile, resolveProfileKey } = useStore();
  const { addToast } = useToast();

  const extractedQuestions = useMemo(() => {
    const parsed = extractExamQuestions(studyContent);
    return parsed.length > 0 ? parsed : [DEFAULT_FALLBACK_QUESTION];
  }, [studyContent]);

  const [questions, setQuestions] = useState<string[]>(extractedQuestions);
  const [activeIndex, setActiveIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<number, QuestionAttempt>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [isGeneratingViva, setIsGeneratingViva] = useState(false);
  const [isEvaluatingViva, setIsEvaluatingViva] = useState(false);

  useEffect(() => {
    setQuestions(extractedQuestions);
    setActiveIndex(0);
  }, [extractedQuestions]);

  const currentQuestion = questions[activeIndex] || DEFAULT_FALLBACK_QUESTION;
  const currentAttempt: QuestionAttempt = attempts[activeIndex] || {
    question: currentQuestion,
    userAnswer: '',
    feedback: '',
    vivaDefense: '',
    vivaFeedback: '',
  };

  const updateCurrentAttempt = (patch: Partial<QuestionAttempt>) => {
    setAttempts((prev) => {
      const existing = prev[activeIndex] || {
        question: currentQuestion,
        userAnswer: '',
        feedback: '',
        vivaDefense: '',
        vivaFeedback: '',
      };
      return {
        ...prev,
        [activeIndex]: { ...existing, ...patch },
      };
    });
  };

  const handleQuestionChange = (newQ: string) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === activeIndex ? newQ : q)));
    updateCurrentAttempt({ question: newQ });
  };

  const handleAddCustomQuestion = () => {
    const nextIdx = questions.length;
    const promptText = 'Enter your custom examination question...';
    setQuestions((prev) => [...prev, promptText]);
    setActiveIndex(nextIdx);
  };

  const gradedScores = (Object.values(attempts) as QuestionAttempt[])
    .map((a) => a.score)
    .filter((s): s is number => typeof s === 'number');
  const averageScore =
    gradedScores.length > 0
      ? Math.round(gradedScores.reduce((acc, s) => acc + s, 0) / gradedScores.length)
      : null;

  const compileSessionReport = (updatedMap: Record<number, QuestionAttempt>): string => {
    const parts: string[] = [];
    Object.keys(updatedMap)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((idx) => {
        const att = updatedMap[idx];
        if (!att?.feedback) return;
        let block = `## Question ${idx + 1}: ${att.question}\n\n**Student Answer:**\n${att.userAnswer}\n\n${att.feedback}`;
        if (att.vivaPrompt) {
          block += `\n\n### Viva Voce Probe\n**Examiner Challenge:** ${att.vivaPrompt}`;
        }
        if (att.vivaFeedback) {
          block += `\n\n**Student Defense:** ${att.vivaDefense}\n\n**Viva Voce Verdict:**\n${att.vivaFeedback}`;
        }
        parts.push(block);
      });
    return parts.join('\n\n---\n\n');
  };

  const getEffectiveProfile = () =>
    activeProfile
      ? {
          ...activeProfile,
          apiKey: resolveProfileKey(activeProfile),
        }
      : undefined;

  const handleGradeAnswer = async () => {
    if (!currentAttempt.userAnswer.trim()) {
      addToast('Please enter an answer to evaluate', 'error');
      return;
    }

    setIsGrading(true);
    updateCurrentAttempt({ feedback: '', score: undefined });

    const evaluationPrompt = `
You are the University Head Examiner.
You are evaluating a graduate student's answer to this examination question:

QUESTION:
"${currentQuestion}"

STUDENT ANSWER:
"${currentAttempt.userAnswer}"

REFERENCE STUDY MATERIAL / VAULT SUMMARY:
"""
${studyContent.slice(0, 15000)}
"""

Please provide a formal examination grading report:
1. SCORE: Assign a mark out of 100 (e.g. 88/100) and grade tier (First Class / Distinction / Merit / Pass / Fail).
2. STRENGTHS: What concepts or evidence did the student articulate accurately?
3. CRITICAL GAPS & OMISSIONS: What key mechanisms, literature nuances, or counter-arguments were missed?
4. MODEL REVISION: How should the student revise their answer to achieve a 100/100 mark?
Format cleanly in Markdown with bold headers.
`;

    let completeFeedback = '';

    try {
      await routeAIRequest({
        provider: config.aiProvider,
        activeProfile: getEffectiveProfile(),
        systemPrompt:
          'You are an uncompromising, rigorous Graduate Level Academic Examiner. Grade student submissions objectively against study materials.',
        userPrompt: evaluationPrompt,
        config: {
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
        },
        onChunk: (chunk) => {
          completeFeedback += chunk;
          const detectedScore = parseScoreFromFeedback(completeFeedback);
          updateCurrentAttempt({
            feedback: completeFeedback,
            score: detectedScore,
          });
        },
      });

      const finalScore = parseScoreFromFeedback(completeFeedback);
      const nextMap: Record<number, QuestionAttempt> = {
        ...attempts,
        [activeIndex]: {
          ...currentAttempt,
          question: currentQuestion,
          feedback: completeFeedback.trim(),
          score: finalScore,
        },
      };
      setAttempts(nextMap);

      if (onGradingComplete && completeFeedback.trim()) {
        onGradingComplete(compileSessionReport(nextMap));
      }
      addToast(
        finalScore !== undefined
          ? `Graded Q${activeIndex + 1}: ${finalScore}/100`
          : 'Grading report generated',
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Failed to grade submission', 'error');
    } finally {
      setIsGrading(false);
    }
  };

  const handleGenerateVivaProbe = async () => {
    if (!currentAttempt.feedback) return;
    setIsGeneratingViva(true);
    updateCurrentAttempt({ vivaPrompt: '', vivaFeedback: '' });

    const vivaPromptRequest = `
You are a Graduate Oral Defense (Viva Voce) Examiner.
Based on the original question, the student's submitted answer, and your grading report below, issue ONE sharp, adversarial 2-sentence Viva Voce follow-up question that tests whether the student's mechanism or argument holds under an extreme boundary condition, edge case, or counter-example from the Context Vault.

ORIGINAL QUESTION: "${currentQuestion}"
STUDENT ANSWER: "${currentAttempt.userAnswer}"
GRADING REPORT: "${currentAttempt.feedback.slice(0, 3000)}"

Output ONLY the direct Viva Voce challenge question to the candidate.
`;

    let streamedProbe = '';
    try {
      await routeAIRequest({
        provider: config.aiProvider,
        activeProfile: getEffectiveProfile(),
        systemPrompt:
          'You are a Socratic Viva Voce Oral Examiner. Challenge the candidate with a single incisive follow-up probe.',
        userPrompt: vivaPromptRequest,
        config: {
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
        },
        onChunk: (chunk) => {
          streamedProbe += chunk;
          updateCurrentAttempt({ vivaPrompt: streamedProbe });
        },
      });
      addToast('Viva Voce Probe issued!', 'info');
    } catch (err: any) {
      addToast(err.message || 'Failed to generate Viva Voce Probe', 'error');
    } finally {
      setIsGeneratingViva(false);
    }
  };

  const handleEvaluateVivaDefense = async () => {
    if (!currentAttempt.vivaDefense.trim()) {
      addToast('Please enter your Viva Voce defense', 'error');
      return;
    }

    setIsEvaluatingViva(true);
    updateCurrentAttempt({ vivaFeedback: '' });

    const defenseEvalPrompt = `
You are the Chair of the Viva Voce Examination Committee.
Evaluate the candidate's oral defense response to your follow-up probe.

ORIGINAL QUESTION: "${currentQuestion}"
VIVA VOCE PROBE: "${currentAttempt.vivaPrompt}"
CANDIDATE DEFENSE: "${currentAttempt.vivaDefense}"
STUDY MATERIAL REFERENCE: "${studyContent.slice(0, 8000)}"

Provide a concise Viva Voce Verdict:
1. **DEFENSE VERDICT**: (Pass with Distinction / Satisfactory Defense / Unconvincing Defense) & Bonus Marks (+0 to +10).
2. **CRITIQUE OF DEFENSE**: Did the candidate address the boundary condition rigorously?
3. **IDEAL ORAL REBUTTAL**: A 3-sentence exemplar defense.
`;

    let streamedVerdict = '';
    try {
      await routeAIRequest({
        provider: config.aiProvider,
        activeProfile: getEffectiveProfile(),
        systemPrompt:
          'You are the Chair of a Graduate Viva Voce Committee. Evaluate the candidate defense concisely and rigorously.',
        userPrompt: defenseEvalPrompt,
        config: {
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
        },
        onChunk: (chunk) => {
          streamedVerdict += chunk;
          updateCurrentAttempt({ vivaFeedback: streamedVerdict });
        },
      });

      const nextMap: Record<number, QuestionAttempt> = {
        ...attempts,
        [activeIndex]: {
          ...currentAttempt,
          vivaFeedback: streamedVerdict.trim(),
        },
      };
      setAttempts(nextMap);
      if (onGradingComplete) {
        onGradingComplete(compileSessionReport(nextMap));
      }
      addToast('Viva Voce defense evaluated!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to evaluate Viva Voce defense', 'error');
    } finally {
      setIsEvaluatingViva(false);
    }
  };

  return (
    <div className="mt-8 border-t border-white/10 pt-6 space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-cyberLime" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Examination Session & Viva Voce Simulator
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {averageScore !== null && (
            <span className="text-[10px] font-mono text-white bg-deepViolet/20 px-2.5 py-0.5 rounded border border-deepViolet/40 font-bold">
              Session Mastery: {averageScore}/100 ({gradedScores.length}/{questions.length} Graded)
            </span>
          )}
          <span className="text-[10px] font-mono text-cyberLime bg-cyberLime/10 px-2 py-0.5 rounded border border-cyberLime/30">
            {questions.length} Exam Question{questions.length !== 1 && 's'} Parsed
          </span>
        </div>
      </div>

      {/* Multi-Question Queue Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {questions.map((_, idx) => {
          const att = attempts[idx];
          const isCurrent = idx === activeIndex;
          const hasGraded = Boolean(att?.feedback);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 border ${
                isCurrent
                  ? 'bg-cyberLime/15 text-cyberLime border-cyberLime/40 font-bold shadow-[0_0_12px_rgba(132,249,6,0.15)]'
                  : hasGraded
                    ? 'bg-deepViolet/15 text-gray-200 border-deepViolet/30 hover:border-deepViolet/50'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Q{idx + 1}</span>
              {att?.score !== undefined ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/50 text-cyberLime">
                  {att.score}%
                </span>
              ) : hasGraded ? (
                <CheckCircle2 className="w-3 h-3 text-cyberLime" />
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleAddCustomQuestion}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyberLime border border-dashed border-white/15 shrink-0 transition-colors"
          title="Add a custom exam question to the queue"
        >
          <Plus className="w-3 h-3" />
          <span>Custom</span>
        </button>
      </div>

      {/* Target Question Box */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyberLime" />
            Question {activeIndex + 1} of {questions.length}
          </span>
          {currentAttempt.score !== undefined && (
            <span className="text-cyberLime font-bold">
              Recorded Mark: {currentAttempt.score}/100
            </span>
          )}
        </div>
        <input
          type="text"
          value={currentQuestion}
          onChange={(e) => handleQuestionChange(e.target.value)}
          placeholder="Paste or type an exam question from the study guide above..."
          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-200 outline-none focus:border-cyberLime/50 font-sans"
        />
      </div>

      {/* Answer Workspace */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
          Your Answer / Essay Submission (Q{activeIndex + 1})
        </label>
        <textarea
          value={currentAttempt.userAnswer}
          onChange={(e) => updateCurrentAttempt({ userAnswer: e.target.value })}
          placeholder="Draft your comprehensive exam response here. Be rigorous, define key terms, and reference theories..."
          className="w-full min-h-[140px] bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-cyberLime/50 resize-y leading-relaxed"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        {currentAttempt.feedback && (
          <>
            <GhostButton
              onClick={() => {
                updateCurrentAttempt({
                  feedback: '',
                  score: undefined,
                  vivaPrompt: undefined,
                  vivaFeedback: '',
                });
              }}
              className="text-xs"
            >
              Clear Report
            </GhostButton>
            <button
              type="button"
              onClick={handleGenerateVivaProbe}
              disabled={isGeneratingViva}
              className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingViva ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Issuing Viva Probe...
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Viva Voce Probe (Challenge Me)
                </>
              )}
            </button>
          </>
        )}
        <PrimaryButton
          onClick={handleGradeAnswer}
          disabled={isGrading}
          className="text-xs h-10 px-5"
        >
          {isGrading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating Answer...
            </>
          ) : (
            <>
              <Award className="w-3.5 h-3.5" /> Submit to Examiner for Grading
            </>
          )}
        </PrimaryButton>
      </div>

      {/* Examiner Report card */}
      {(currentAttempt.feedback || isGrading) && (
        <div className="p-6 rounded-xl bg-black/70 border border-deepViolet/40 shadow-glow-violet space-y-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-cyberLime" />
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Examiner Grading & Rubric Evaluation (Q{activeIndex + 1})
              </h4>
            </div>
            {currentAttempt.score !== undefined && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyberLime/20 border border-cyberLime/40 text-cyberLime text-xs font-mono font-bold">
                {currentAttempt.score} / 100
              </span>
            )}
          </div>
          <MarkdownRenderer content={currentAttempt.feedback} isGenerating={isGrading} />
        </div>
      )}

      {/* 1-Turn Viva Voce Follow-Up Probe Card */}
      {(currentAttempt.vivaPrompt || isGeneratingViva) && (
        <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                Oral Defense — Viva Voce Follow-Up Probe
              </h4>
            </div>
            <span className="text-[10px] font-mono text-amber-400/80">1-Turn Defense</span>
          </div>

          <div className="text-xs text-amber-100/90 leading-relaxed italic bg-black/40 p-3.5 rounded-lg border border-amber-500/20">
            <MarkdownRenderer
              content={currentAttempt.vivaPrompt || ''}
              isGenerating={isGeneratingViva}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-amber-300/80 uppercase tracking-wider">
              Your Oral Defense Rebuttal
            </label>
            <textarea
              value={currentAttempt.vivaDefense}
              onChange={(e) => updateCurrentAttempt({ vivaDefense: e.target.value })}
              placeholder="Defend your mechanism or qualify the boundary condition raised by the Examiner..."
              className="w-full min-h-[90px] bg-black/50 border border-amber-500/30 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-amber-400 resize-y leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEvaluateVivaDefense}
              disabled={isEvaluatingViva}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs font-mono hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isEvaluatingViva ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating Defense...
                </>
              ) : (
                <>
                  <Award className="w-3.5 h-3.5" /> Submit Viva Defense
                </>
              )}
            </button>
          </div>

          {(currentAttempt.vivaFeedback || isEvaluatingViva) && (
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <MarkdownRenderer
                content={currentAttempt.vivaFeedback}
                isGenerating={isEvaluatingViva}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
