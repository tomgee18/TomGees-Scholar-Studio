import React, { useState } from 'react';
import {
  GraduationCap,
  RefreshCw,
  Award,
  HelpCircle,
} from 'lucide-react';
import { PrimaryButton, GhostButton } from './ui/GlassComponents';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { useStore } from '../context/ContextStore';
import { routeAIRequest } from '../lib/ai/aiRouter';
import { useToast } from '../context/ToastContext';

interface SocraticQuizPanelProps {
  studyContent: string;
  onGradingComplete?: (report: string) => void;
}

export const SocraticQuizPanel = ({
  studyContent,
  onGradingComplete,
}: SocraticQuizPanelProps) => {
  const { config, activeProfile, resolveProfileKey } = useStore();
  const { addToast } = useToast();

  const [userAnswer, setUserAnswer] = useState('');
  const [activeQuestion, setActiveQuestion] = useState(
    'Synthesize the primary thesis of the Vault documents and identify its core methodological limitation.'
  );
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleGradeAnswer = async () => {
    if (!userAnswer.trim()) {
      addToast('Please enter an answer to evaluate', 'error');
      return;
    }

    setIsGrading(true);
    setFeedback('');

    const evaluationPrompt = `
You are the University Head Examiner.
You are evaluating a graduate student's answer to this examination question:

QUESTION:
"${activeQuestion}"

STUDENT ANSWER:
"${userAnswer}"

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
      const effectiveProfile = activeProfile
        ? {
            ...activeProfile,
            apiKey: resolveProfileKey(activeProfile),
          }
        : undefined;

      await routeAIRequest({
        provider: config.aiProvider,
        activeProfile: effectiveProfile,
        systemPrompt:
          'You are an uncompromising, rigorous Graduate Level Academic Examiner. Grade student submissions objectively against study materials.',
        userPrompt: evaluationPrompt,
        config: {
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
        },
        onChunk: (chunk) => {
          completeFeedback += chunk;
          setFeedback((prev) => prev + chunk);
        },
      });

      if (onGradingComplete && completeFeedback.trim()) {
        onGradingComplete(completeFeedback.trim());
      }
      addToast('Grading report generated', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to grade submission', 'error');
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="mt-8 border-t border-white/10 pt-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-cyberLime" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Socratic Exam Simulator & Grading
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyberLime bg-cyberLime/10 px-2 py-0.5 rounded border border-cyberLime/30">
          Interactive Evaluation
        </span>
      </div>

      {/* Target Question Box */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-cyberLime" />
          Target Exam Question
        </div>
        <input
          type="text"
          value={activeQuestion}
          onChange={(e) => setActiveQuestion(e.target.value)}
          placeholder="Paste or type an exam question from the study guide above..."
          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-200 outline-none focus:border-cyberLime/50 font-sans"
        />
      </div>

      {/* Answer Workspace */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
          Your Answer / Essay Submission
        </label>
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Draft your comprehensive exam response here. Be rigorous, define key terms, and reference theories..."
          className="w-full min-h-[140px] bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-cyberLime/50 resize-y leading-relaxed"
        />
      </div>

      {/* Action button */}
      <div className="flex justify-end gap-3">
        {feedback && (
          <GhostButton
            onClick={() => {
              setFeedback('');
              if (onGradingComplete) onGradingComplete('');
            }}
            className="text-xs"
          >
            Clear Report
          </GhostButton>
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
      {(feedback || isGrading) && (
        <div className="p-6 rounded-xl bg-black/70 border border-deepViolet/40 shadow-glow-violet space-y-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Award className="w-4 h-4 text-cyberLime" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Examiner Grading & Rubric Evaluation
            </h4>
          </div>
          <MarkdownRenderer content={feedback} isGenerating={isGrading} />
        </div>
      )}
    </div>
  );
};
