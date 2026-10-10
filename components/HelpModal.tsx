import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  BookOpen,
  GraduationCap,
  Keyboard,
  Database,
  Download,
  KeyRound,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'quickstart' | 'modes' | 'shortcuts' | 'rag' | 'exports' | 'troubleshooting';

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('quickstart');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[640px] max-h-[90vh] bg-gray-900 border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Scholar Studio Help Center"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyberLime/10 border border-cyberLime/20 flex items-center justify-center text-cyberLime">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Scholar Studio Reference Manual
                <span className="text-[10px] font-mono font-normal uppercase px-2 py-0.5 rounded bg-white/10 text-gray-300">
                  v1.0 Production
                </span>
              </h2>
              <p className="text-xs text-gray-400">Complete guide to scholarly workflows, AI modes, and shortcuts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono hidden sm:inline">Press Esc to close</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Close Manual (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <nav className="w-60 border-r border-white/10 bg-black/20 p-3 flex flex-col gap-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'quickstart'
                  ? 'bg-cyberLime/15 text-cyberLime border border-cyberLime/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>Getting Started</span>
            </button>

            <button
              onClick={() => setActiveTab('modes')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'modes'
                  ? 'bg-cyberLime/15 text-cyberLime border border-cyberLime/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <GraduationCap className="w-4 h-4 flex-shrink-0" />
              <span>4 Scholarly Modes</span>
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'shortcuts'
                  ? 'bg-cyberLime/15 text-cyberLime border border-cyberLime/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Keyboard className="w-4 h-4 flex-shrink-0" />
              <span>Keyboard Shortcuts</span>
            </button>

            <button
              onClick={() => setActiveTab('rag')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'rag'
                  ? 'bg-cyberLime/15 text-cyberLime border border-cyberLime/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Database className="w-4 h-4 flex-shrink-0" />
              <span>Context Vault & RAG</span>
            </button>

            <button
              onClick={() => setActiveTab('exports')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'exports'
                  ? 'bg-cyberLime/15 text-cyberLime border border-cyberLime/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              <span>Export Hub & Anki</span>
            </button>

            <button
              onClick={() => setActiveTab('troubleshooting')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'troubleshooting'
                  ? 'bg-cyberLime/15 text-cyberLime border border-cyberLime/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-4 h-4 flex-shrink-0" />
              <span>API Keys & Security</span>
            </button>
          </nav>

          {/* Main Content Pane */}
          <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed text-gray-300 space-y-6">
            {activeTab === 'quickstart' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Welcome to TomGee's Scholar Studio</h3>
                  <p className="text-gray-400">
                    An advanced desktop and web research suite designed for master's/doctoral research, comprehensive exam preparation, and rigorous academic drafting.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-cyberLime font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-cyberLime/20 flex items-center justify-center text-[11px]">1</span>
                      Load Your Context Vault
                    </div>
                    <p className="text-gray-400">
                      Drag & drop PDFs, text files, syllabus notes, and lecture transcripts into the left sidebar. Files are chunked and indexed client-side into IndexedDB.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[11px]">2</span>
                      Choose Your Scholar Mode
                    </div>
                    <p className="text-gray-400">
                      Switch between <strong>Exam & Mastery</strong>, <strong>Thesis & Dissertation</strong>, <strong>Literature Review</strong>, or <strong>Custom Scholar</strong> mode.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
                      Socratic Grading Simulator
                    </div>
                    <p className="text-gray-400">
                      In Exam Mode, answer generated practice questions in the Interactive Simulator to receive instant automated scoring (0–100) and rubric critique.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[11px]">4</span>
                      Scholar Copilot Sidebar
                    </div>
                    <p className="text-gray-400">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Alt + C</kbd> anytime to open the Copilot to critique text, test counterarguments, and insert snippets.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-cyberLime/5 border border-cyberLime/20 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyberLime flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-white text-xs">Offline-First & Zero-Leak Architecture</h4>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Your files never leave your machine except when explicitly queried against your chosen AI model endpoint. Documents are stored in IndexedDB and API keys reside strictly in your system environment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'modes' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white mb-2">The 4 Academic Engine Modes</h3>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-cyberLime text-xs flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> Exam & Mastery Mode
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">High-Yield Synthesis</span>
                    </div>
                    <p className="text-gray-300 mb-2">
                      Generates high-yield study packages: Core Conceptual Theorems, 10 High-Yield Exam Questions with Marking Rubrics, Diagnostic Traps & Edge Cases, and Anki Flashcard sets.
                    </p>
                    <div className="text-[11px] text-gray-400 bg-black/30 p-2 rounded border border-white/5 font-mono">
                      Includes: Interactive Socratic Quiz Simulator with instant scoring & examiner report.
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-deepViolet text-xs flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Thesis & Dissertation Mode
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">Formal Academic Chapters</span>
                    </div>
                    <p className="text-gray-300">
                      Drafts rigorous thesis sections formatted according to graduate standards: theoretical grounding, methodology rationales, literature synthesis, and formal discursive flow with scholarly tone.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-blue-400 text-xs flex items-center gap-2">
                        <Database className="w-4 h-4" /> Literature Review & Meta-Synthesis Mode
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">Thematic Matrix</span>
                    </div>
                    <p className="text-gray-300">
                      Synthesizes uploaded papers across authors and schools of thought. Identifies academic consensus, methodological tensions, and highlighted gaps for novel research contributions.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-gray-300 text-xs flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-gray-400" /> Custom Scholar Mode
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">Freeform Grounding</span>
                    </div>
                    <p className="text-gray-300">
                      Unconstrained research prompting strictly grounded in your active Context Vault documents with structured tables, latex math notation, and citation indicators.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Keyboard Shortcuts Cheat Sheet</h3>
                  <span className="text-[10px] font-mono text-gray-400">Global Keybindings</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-[11px] font-mono">
                        <th className="py-2.5 px-4 font-semibold">Keybinding</th>
                        <th className="py-2.5 px-4 font-semibold">Action</th>
                        <th className="py-2.5 px-4 font-semibold">Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono font-bold text-cyberLime">
                          <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20">F1</kbd>
                        </td>
                        <td className="py-2.5 px-4 text-white">Open / Close Help Reference Manual</td>
                        <td className="py-2.5 px-4 text-gray-400">Global</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">
                          <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20">Alt + C</kbd>
                        </td>
                        <td className="py-2.5 px-4 text-white">Toggle Scholar Copilot Chat Drawer</td>
                        <td className="py-2.5 px-4 text-gray-400">Global</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">
                          <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20">Ctrl + Enter</kbd>{' '}
                          <span className="text-gray-500 font-normal">/</span>{' '}
                          <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20">Cmd + Enter</kbd>
                        </td>
                        <td className="py-2.5 px-4 text-white">Trigger Draft Generation from Directive Prompt</td>
                        <td className="py-2.5 px-4 text-gray-400">Prompt Box</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono font-bold text-gray-300">
                          <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20">Esc</kbd>
                        </td>
                        <td className="py-2.5 px-4 text-white">Dismiss any active modal or drawer</td>
                        <td className="py-2.5 px-4 text-gray-400">Modals</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono font-bold text-purple-400">
                          <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20">Enter</kbd>
                        </td>
                        <td className="py-2.5 px-4 text-white">Send message in Scholar Copilot</td>
                        <td className="py-2.5 px-4 text-gray-400">Copilot Input</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono font-bold text-purple-400">
                          <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20">Shift + Enter</kbd>
                        </td>
                        <td className="py-2.5 px-4 text-white">Insert line break without sending</td>
                        <td className="py-2.5 px-4 text-gray-400">Copilot Input</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'rag' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">Context Vault & Client-Side BM25 RAG</h3>
                <p className="text-gray-300">
                  To prevent context window saturation and exorbitant token usage, Scholar Studio uses an adaptive dual-tier token management engine:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <span className="font-semibold text-cyberLime text-xs">Direct Injection Tier</span>
                    <p className="text-gray-400">
                      When your uploaded documents total fewer tokens than 60% of the active model's window, the complete text is cleanly injected to ensure 100% holistic comprehension.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <span className="font-semibold text-indigo-400 text-xs">BM25 Retrieval Tier (RAG)</span>
                    <p className="text-gray-400">
                      When context exceeds 60% or when on compact local models (Ollama/LM Studio), document text is split into ~400-word chunks and BM25 relevance scores retrieve the top-15 most pertinent passages.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <h4 className="font-semibold text-white text-xs mb-1">Document Inspector Modal</h4>
                  <p className="text-gray-400">
                    Click the search icon next to any document in the sidebar to view its raw extracted text, word count, and toggle its participation in drafting context.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'exports' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">Modular Export Hub</h3>
                <p className="text-gray-300">
                  Rather than dumping an unformatted single file, the <strong>Export Hub</strong> extracts specific pedagogical deliverables from your generated study suites:
                </p>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-cyberLime/20 text-cyberLime flex items-center justify-center font-bold text-xs flex-shrink-0">
                      A
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Student Mock Exam (Questions Only)</h4>
                      <p className="text-gray-400 text-[11px]">
                        Extracts only the examination questions, stripping answers and rubrics to create a clean test paper with student answer response rules.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      B
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Marking Scheme & Rubrics</h4>
                      <p className="text-gray-400 text-[11px]">
                        Isolates model solutions, key points, grading weights, and common pitfalls for examiner use.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      C
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Anki Flashcard Deck (.tsv)</h4>
                      <p className="text-gray-400 text-[11px]">
                        Parses flashcards into standard tab-separated format (<code className="text-cyberLime">#separator:tab</code>) with question and answer columns ready for immediate import into Anki or Quizlet.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      D
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Examiner Diagnostic Report</h4>
                      <p className="text-gray-400 text-[11px]">
                        Exports your Socratic grading results including score breakdown, conceptual strengths, diagnostic weaknesses, and recommended remediation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'troubleshooting' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">API Keys, Endpoints & Security</h3>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <h4 className="font-semibold text-cyberLime text-xs">System Environment Variable Resolution</h4>
                  <p className="text-gray-300">
                    To maintain strict security best practices, Scholar Studio automatically detects API keys from your host OS environment without storing them in browser plaintext:
                  </p>
                  <div className="bg-black/50 p-2.5 rounded font-mono text-[11px] text-gray-300 space-y-1">
                    <div><span className="text-cyberLime">GEMINI_API_KEY</span>: Google Gemini Direct API</div>
                    <div><span className="text-indigo-400">DEEPSEEK_API_KEY</span>: DeepSeek Chat / Reasoner</div>
                    <div><span className="text-emerald-400">GROQ_API_KEY</span>: Groq Llama 3.3 70B & Mixtral</div>
                    <div><span className="text-purple-400">OPENROUTER_API_KEY</span>: Multi-model OpenRouter</div>
                    <div><span className="text-blue-400">OLLAMA_HOST</span>: Local Ollama daemon (defaults to http://localhost:11434)</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <h4 className="font-semibold text-white text-xs">Tauri Desktop Native IPC</h4>
                  <p className="text-gray-300">
                    When running as the native desktop application (<code className="text-cyberLime">tomgees_scholar_studio.exe</code>), the Rust backend queries your operating system environment directly via Tauri IPC (<code className="text-gray-400">get_system_env_vars</code>).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>Shortcut: Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">F1</kbd>
            <span>anywhere to toggle this manual</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors text-xs font-medium"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
