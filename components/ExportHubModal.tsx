import React from 'react';
import {
  X,
  Download,
  Printer,
  FileCode,
  FileText,
  GraduationCap,
  Award,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  extractExportSections,
  downloadTextFile,
  printSnippetToPdf,
} from '../lib/exportParser';
import { DraftMode } from '../types';
import { useToast } from '../context/ToastContext';

interface ExportHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullContent: string;
  examinerReport?: string;
  selectedMode: DraftMode;
}

export const ExportHubModal = ({
  isOpen,
  onClose,
  fullContent,
  examinerReport,
  selectedMode,
}: ExportHubModalProps) => {
  const { addToast } = useToast();

  if (!isOpen || !fullContent) return null;

  const sections = extractExportSections(fullContent, examinerReport);
  const timestamp = Date.now();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-obsidian border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-cyberLime" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Modular Scholar Export Hub
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Cards Grid */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* 1. Complete Study Suite */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <BookOpen className="w-4 h-4 text-cyberLime" />
                Complete Document ({selectedMode.replace('_', ' ')})
              </div>
              <p className="text-xs text-gray-400">
                The full composite text including all chapters, notes, tables, and questions.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  printSnippetToPdf(`Scholar Studio - ${selectedMode}`, sections.fullText);
                  addToast('Print dialog opened', 'info');
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-red-400" /> PDF Print
              </button>
              <button
                onClick={() => {
                  downloadTextFile(sections.fullText, `TomGees-${selectedMode}-${timestamp}.md`, 'text/markdown');
                  addToast('Exported Markdown (.md)', 'success');
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5 text-cyberLime" /> Markdown
              </button>
              <button
                onClick={() => {
                  downloadTextFile(sections.fullText, `TomGees-${selectedMode}-${timestamp}.txt`, 'text/plain');
                  addToast('Exported Plain Text (.txt)', 'success');
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400" /> Text
              </button>
            </div>
          </div>

          {/* 2. Student Mock Exam Paper (Questions Only) */}
          {sections.examPaper && (
            <div className="p-4 rounded-xl bg-white/5 border border-cyberLime/20 hover:border-cyberLime/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-cyberLime">
                  <GraduationCap className="w-4 h-4 text-cyberLime" />
                  Student Mock Exam Paper (Questions Only)
                </div>
                <p className="text-xs text-gray-400">
                  Examination paper without solutions or rubrics — ready to print and take under test conditions.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    printSnippetToPdf('Mock Exam Paper (Student Copy)', sections.examPaper!);
                    addToast('Exam Paper Print dialog opened', 'info');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyberLime/15 hover:bg-cyberLime/25 text-xs font-mono text-cyberLime border border-cyberLime/30 flex items-center gap-1.5 font-bold"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Exam Paper
                </button>
                <button
                  onClick={() => {
                    downloadTextFile(sections.examPaper!, `ExamPaper-StudentCopy-${timestamp}.md`, 'text/markdown');
                    addToast('Exported Student Exam Paper (.md)', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyberLime" /> Markdown
                </button>
              </div>
            </div>
          )}

          {/* 3. Official Marking Scheme & Rubrics */}
          {sections.markingScheme && (
            <div className="p-4 rounded-xl bg-white/5 border border-deepViolet/20 hover:border-deepViolet/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-deepViolet">
                  <Award className="w-4 h-4 text-deepViolet" />
                  Official Marking Scheme & Exemplar Answers
                </div>
                <p className="text-xs text-gray-400">
                  Point-by-point marking rubric and top-tier model answers for post-exam self-grading.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    printSnippetToPdf('Official Marking Scheme & Rubrics', sections.markingScheme!);
                    addToast('Marking Scheme Print dialog opened', 'info');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-deepViolet/15 hover:bg-deepViolet/25 text-xs font-mono text-deepViolet border border-deepViolet/30 flex items-center gap-1.5 font-bold"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Rubric
                </button>
                <button
                  onClick={() => {
                    downloadTextFile(sections.markingScheme!, `MarkingScheme-${timestamp}.md`, 'text/markdown');
                    addToast('Exported Marking Scheme (.md)', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5 text-deepViolet" /> Markdown
                </button>
              </div>
            </div>
          )}

          {/* 4. Active Recall -> Anki / Quizlet Flashcards */}
          {sections.ankiDeckText && (
            <div className="p-4 rounded-xl bg-white/5 border border-blue-500/20 hover:border-blue-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Anki / Quizlet Flashcard Deck ({sections.ankiCardCount} Cards)
                </div>
                <p className="text-xs text-gray-400">
                  Tab-delimited Q&A pairs formatted for instant 1-click import into Anki or Quizlet.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    downloadTextFile(sections.ankiDeckText!, `AnkiDeck-${timestamp}.txt`, 'text/tab-separated-values');
                    addToast(`Downloaded ${sections.ankiCardCount} Anki cards (.txt)`, 'success');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-xs font-mono text-blue-300 border border-blue-500/30 flex items-center gap-1.5 font-bold"
                >
                  <Download className="w-3.5 h-3.5" /> Download Anki (.txt)
                </button>
                <button
                  onClick={() => {
                    downloadTextFile(sections.ankiDeckText!, `Flashcards-${timestamp}.csv`, 'text/csv');
                    addToast('Downloaded Flashcards (.csv)', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> CSV
                </button>
              </div>
            </div>
          )}

          {/* 5. Examiner Evaluation Report (if Socratic graded) */}
          {sections.examinerReport && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="w-4 h-4 text-cyberLime" />
                  Examiner Socratic Evaluation Report
                </div>
                <p className="text-xs text-gray-400">
                  Your submitted answer along with examiner mark breakdown, critique, and model revision.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    printSnippetToPdf('Examiner Evaluation Report', sections.examinerReport!);
                    addToast('Print dialog opened', 'info');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-red-400" /> PDF Print
                </button>
                <button
                  onClick={() => {
                    downloadTextFile(sections.examinerReport!, `ExaminerReport-${timestamp}.md`, 'text/markdown');
                    addToast('Exported Evaluation (.md)', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyberLime" /> Markdown
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
