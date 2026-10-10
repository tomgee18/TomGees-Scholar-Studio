import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Download,
  Settings,
  Sparkles,
  StopCircle,
  BookOpen,
  GraduationCap,
  Library,
  PenTool,
  Eraser,
  Copy,
  Check,
  Globe,
  History,
  AlertTriangle,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { runDraftEngine, constructSystemPrompt } from '../lib/ai/draftEngine';
import { calculateTokenBudget } from '../lib/ai/tokenManager';
import { PrimaryButton, GlassCard } from './ui/GlassComponents';
import { DraftingState, DraftMode, AIProvider, DraftHistoryItem } from '../types';
import { SettingsModal } from './SettingsModal';
import { DraftHistoryDrawer } from './DraftHistoryDrawer';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { SocraticQuizPanel } from './SocraticQuizPanel';
import { ExportHubModal } from './ExportHubModal';
import { ScholarCopilot } from './ScholarCopilot';
import { HelpModal } from './HelpModal';
import { useToast } from '../context/ToastContext';

export const Workspace = () => {
  const {
    documents,
    getFullContextString,
    getRetrievedContextString,
    config,
    updateConfig,
    activeProfile,
    resolveProfileKey,
    saveDraftToHistory,
  } = useStore();
  const { addToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<DraftMode>(DraftMode.EXAM_MASTERY);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportHubOpen, setIsExportHubOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latestExaminerReport, setLatestExaminerReport] = useState('');

  const [state, setState] = useState<DraftingState>({
    isGenerating: false,
    output: '',
    error: null,
  });

  const outputContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const handleGenerateRef = useRef<() => void>(() => {});

  useEffect(() => {
    isMounted.current = true;
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 for Help Manual
      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // Alt + C for Copilot
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
        return;
      }

      // Esc closes open overlays
      if (e.key === 'Escape') {
        setIsHelpOpen(false);
        setIsSettingsOpen(false);
        setIsHistoryOpen(false);
        setIsExportHubOpen(false);
        setIsCopilotOpen(false);
        return;
      }

      // Ctrl/Cmd + Enter triggers generation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!state.isGenerating && prompt.trim()) {
          e.preventDefault();
          handleGenerateRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted.current = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isGenerating, prompt]);

  const handleInsertAtCursor = (text: string) => {
    setState((prev) => ({
      ...prev,
      output: prev.output ? `${prev.output}\n\n${text}` : text,
    }));
    addToast('Inserted into draft', 'success');
  };

  const handleAppendToDraft = (text: string) => {
    setState((prev) => ({
      ...prev,
      output: prev.output ? `${prev.output}\n\n${text}` : text,
    }));
    addToast('Appended to draft', 'success');
  };

  useEffect(() => {
    if (state.isGenerating && outputContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = outputContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 150) {
        outputContainerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [state.output, state.isGenerating]);

  // Compute live token budget & determine if smart retrieval should trigger
  const { tokenBudget, isRetrievalActive } = useMemo(() => {
    const vaultText = getFullContextString();
    const systemPrompt = constructSystemPrompt(
      config.customSystemPrompt,
      selectedMode,
      config.webAccessEnabled,
      vaultText
    );
    const activeModelName =
      config.aiProvider === AIProvider.GEMINI_DIRECT
        ? config.geminiModel
        : activeProfile?.model || 'gpt-4o';

    const budget = calculateTokenBudget(
      systemPrompt,
      vaultText,
      prompt,
      activeModelName,
      config.forceSmartRetrieval
    );

    return { tokenBudget: budget, isRetrievalActive: budget.isRAGActive };
  }, [
    getFullContextString,
    config.customSystemPrompt,
    selectedMode,
    config.webAccessEnabled,
    config.aiProvider,
    config.geminiModel,
    config.forceSmartRetrieval,
    activeProfile?.model,
    prompt,
  ]);

  const handleGenerate = async () => {
    if (state.isGenerating) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (isMounted.current) setState((prev) => ({ ...prev, isGenerating: false }));
      addToast('Generation aborted', 'info');
      return;
    }

    if (!prompt.trim()) {
      addToast('Please enter a research topic, subject, or exam syllabus directive', 'error');
      return;
    }

    if (config.aiProvider === AIProvider.GEMINI_DIRECT && !config.geminiApiKey) {
      setState((prev) => ({ ...prev, error: 'Gemini API Key missing. Check Settings or System Env.' }));
      addToast('Gemini API Key missing', 'error');
      setIsSettingsOpen(true);
      return;
    }

    if (config.aiProvider === AIProvider.OPENAI_COMPATIBLE) {
      if (!activeProfile) {
        setState((prev) => ({ ...prev, error: 'No active profile selected.' }));
        setIsSettingsOpen(true);
        return;
      }

      const resolvedKey = resolveProfileKey(activeProfile);
      if (
        !resolvedKey &&
        !activeProfile.baseUrl.includes('localhost') &&
        !activeProfile.baseUrl.includes('127.0.0.1')
      ) {
        setState((prev) => ({
          ...prev,
          error: `API Key missing for profile "${activeProfile.name}". Set it in Settings or via ${activeProfile.envKeyName || 'system env'}.`,
        }));
        addToast(`API Key missing for ${activeProfile.name}`, 'error');
        setIsSettingsOpen(true);
        return;
      }
    }

    abortControllerRef.current = new AbortController();
    setState((prev) => ({ ...prev, isGenerating: true, error: null, output: '' }));
    setLatestExaminerReport('');

    let completeOutput = '';

    try {
      const optimalChunks = tokenBudget.optimalChunkCount || 25;
      const context = isRetrievalActive
        ? await getRetrievedContextString(prompt, optimalChunks)
        : getFullContextString();

      const effectiveProfile = activeProfile
        ? {
            ...activeProfile,
            apiKey: resolveProfileKey(activeProfile),
          }
        : undefined;

      await runDraftEngine({
        mode: selectedMode,
        userDirective: prompt,
        contextData: context,
        config: {
          provider: config.aiProvider,
          activeProfile: effectiveProfile,
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
          customSystemPrompt: config.customSystemPrompt,
          webAccessEnabled: config.webAccessEnabled,
        },
        onChunk: (chunk) => {
          completeOutput += chunk;
          if (isMounted.current) {
            setState((prev) => ({
              ...prev,
              output: prev.output + chunk,
            }));
          }
        },
        signal: abortControllerRef.current.signal,
      });

      if (isMounted.current) setState((prev) => ({ ...prev, isGenerating: false }));

      if (completeOutput.trim()) {
        const wordCount = completeOutput.trim().split(/\s+/).length;
        const activeModel =
          config.aiProvider === AIProvider.GEMINI_DIRECT
            ? config.geminiModel
            : activeProfile?.model || 'unknown';

        await saveDraftToHistory({
          title: prompt.slice(0, 80),
          mode: selectedMode,
          prompt,
          output: completeOutput,
          provider: config.aiProvider,
          profileName: activeProfile?.name,
          model: activeModel,
          wordCount,
          sourcesUsed: documents.filter((d) => d.enabled !== false).map((d) => d.name),
        });
        addToast('Study suite saved to history', 'success');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        if (isMounted.current) setState((prev) => ({ ...prev, isGenerating: false }));
        return;
      }

      if (isMounted.current) {
        const errorMsg = err.message || 'An unexpected error occurred.';
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMsg,
        }));
        addToast(errorMsg, 'error');
      }
    }
  };
  handleGenerateRef.current = handleGenerate;

  const handleCopy = async () => {
    if (!state.output) return;
    try {
      await navigator.clipboard.writeText(state.output);
      setCopied(true);
      addToast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const handleSelectHistoryItem = (draft: DraftHistoryItem) => {
    setPrompt(draft.prompt);
    setSelectedMode(draft.mode);
    setState({
      isGenerating: false,
      output: draft.output,
      error: null,
    });
    setLatestExaminerReport('');
    addToast('Restored draft from history', 'info');
  };

  const getModeLabel = (mode: DraftMode) => {
    switch (mode) {
      case DraftMode.EXAM_MASTERY:
        return 'Exam & Mastery';
      case DraftMode.THESIS:
        return 'Thesis & Dissertation';
      case DraftMode.LIT_REVIEW:
        return 'Literature Review';
      case DraftMode.CUSTOM:
      default:
        return 'Custom Scholar';
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-obsidian relative">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <DraftHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectDraft={handleSelectHistoryItem}
      />
      <ExportHubModal
        isOpen={isExportHubOpen}
        onClose={() => setIsExportHubOpen(false)}
        fullContent={state.output}
        examinerReport={latestExaminerReport}
        selectedMode={selectedMode}
      />
      <ScholarCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeDraftText={state.output}
        onInsertAtCursor={handleInsertAtCursor}
        onAppendToDraft={handleAppendToDraft}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Ambient background glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 print:hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-deepViolet/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-cyberLime/5 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 z-10 bg-black/20 backdrop-blur-sm print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            TomGees <span className="font-thin text-gray-500">|</span> Scholar Studio
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">ADVANCED SCHOLARLY RESEARCH & EXAM ENGINE</p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsHelpOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all border ${
              isHelpOpen
                ? 'bg-cyberLime/20 text-cyberLime border-cyberLime/40 shadow-[0_0_12px_rgba(132,249,6,0.2)]'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
            }`}
            title="Help Manual & Shortcuts (F1)"
          >
            <HelpCircle className="w-4 h-4 text-cyberLime" />
            <span>Help</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono hidden sm:inline">
              F1
            </span>
          </button>

          <button
            onClick={() => setIsCopilotOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border ${
              isCopilotOpen
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
            }`}
            title="Toggle Scholar Copilot (Alt+C)"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Copilot</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 hidden sm:inline">
              Alt+C
            </span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5"
            title="Open Draft History"
          >
            <History className="w-4 h-4 text-cyberLime" /> History
          </button>

          {state.output && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5"
                title="Copy to Clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-cyberLime" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsExportHubOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyberLime/10 hover:bg-cyberLime/20 text-sm text-cyberLime border border-cyberLime/30 transition-all font-bold"
                title="Open Modular Export Hub"
              >
                <Download className="w-4 h-4" /> Export Hub
              </button>
            </div>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Open Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden z-10 relative">
        {/* Left Pane: Controls */}
        <div className="w-1/3 min-w-[360px] p-6 flex flex-col gap-5 border-r border-white/5 overflow-y-auto print:hidden">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-500 uppercase">Scholar Mode</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setSelectedMode(DraftMode.EXAM_MASTERY)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                  selectedMode === DraftMode.EXAM_MASTERY
                    ? 'bg-cyberLime/10 border-cyberLime/50 text-white shadow-[0_0_10px_rgba(132,249,6,0.15)]'
                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-cyberLime" />
                <div className="text-left">
                  <div className="font-medium text-xs">Exam & Mastery Mode</div>
                  <div className="text-[10px] opacity-60">High-Yield Synthesis, Mock Exams, Rubrics</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedMode(DraftMode.THESIS)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                  selectedMode === DraftMode.THESIS
                    ? 'bg-deepViolet/10 border-deepViolet/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                }`}
              >
                <BookOpen className="w-4 h-4 text-deepViolet" />
                <div className="text-left">
                  <div className="font-medium text-xs">Thesis & Dissertation Mode</div>
                  <div className="text-[10px] opacity-60">Formal 5-Chapter Academic Synthesis</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedMode(DraftMode.LIT_REVIEW)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                  selectedMode === DraftMode.LIT_REVIEW
                    ? 'bg-blue-500/10 border-blue-500/50 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                }`}
              >
                <Library className="w-4 h-4 text-blue-400" />
                <div className="text-left">
                  <div className="font-medium text-xs">Literature Review & Meta-Synthesis</div>
                  <div className="text-[10px] opacity-60">Thematic Matrix, Consensus & Research Gaps</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedMode(DraftMode.CUSTOM)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                  selectedMode === DraftMode.CUSTOM
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                }`}
              >
                <PenTool className="w-4 h-4 text-gray-400" />
                <div className="text-left">
                  <div className="font-medium text-xs">Custom Scholar Mode</div>
                  <div className="text-[10px] opacity-60">Freeform Prompting Grounded in Vault</div>
                </div>
              </button>
            </div>
          </div>

          {/* Augmentations: OER & Smart Retrieval Mode */}
          <div className="space-y-2">
            <button
              onClick={() => updateConfig({ webAccessEnabled: !config.webAccessEnabled })}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg border text-xs transition-all ${
                config.webAccessEnabled
                  ? 'bg-cyberLime/10 border-cyberLime/50 text-white shadow-[0_0_10px_rgba(132,249,6,0.1)]'
                  : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className={`w-3.5 h-3.5 ${config.webAccessEnabled ? 'text-cyberLime' : 'text-gray-500'}`} />
                <div className="text-left">
                  <div className="font-medium">Open Scholarship (OER)</div>
                </div>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full border ${
                  config.webAccessEnabled ? 'bg-cyberLime border-cyberLime' : 'bg-transparent border-gray-600'
                }`}
              />
            </button>

            {/* Smart Retrieval Mode Switcher */}
            <button
              onClick={() => updateConfig({ forceSmartRetrieval: !config.forceSmartRetrieval })}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg border text-xs transition-all ${
                isRetrievalActive
                  ? 'bg-blue-500/10 border-blue-500/50 text-white shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                  : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap className={`w-3.5 h-3.5 ${isRetrievalActive ? 'text-blue-400' : 'text-gray-500'}`} />
                <div className="text-left">
                  <div className="font-medium">
                    {isRetrievalActive ? 'Smart BM25 Retrieval Active' : 'Full Vault Mode'}
                  </div>
                  <div className="text-[9px] opacity-60">
                    {isRetrievalActive ? 'Injecting Top-15 most relevant chunks' : 'Injecting 100% of enabled files'}
                  </div>
                </div>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full border ${
                  isRetrievalActive ? 'bg-blue-400 border-blue-400' : 'bg-transparent border-gray-600'
                }`}
              />
            </button>
          </div>

          {/* Context Token Budget Meter */}
          <div className="space-y-2 p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-gray-400 flex items-center gap-1.5">
                {tokenBudget.status === 'critical' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Zap className={`w-3.5 h-3.5 ${isRetrievalActive ? 'text-blue-400' : 'text-cyberLime'}`} />
                )}
                <span>Injected Context</span>
              </span>
              <span
                className={
                  tokenBudget.status === 'critical'
                    ? 'text-red-400'
                    : tokenBudget.status === 'warning'
                    ? 'text-yellow-400'
                    : 'text-cyberLime'
                }
              >
                ~{tokenBudget.injectedTokens.toLocaleString()} /{' '}
                {tokenBudget.maxContextTokens >= 1000000
                  ? `${Math.round(tokenBudget.maxContextTokens / 1000000)}M`
                  : `${Math.round(tokenBudget.maxContextTokens / 1024)}k`}{' '}
                ({tokenBudget.usagePercentage}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  tokenBudget.status === 'critical'
                    ? 'bg-red-500'
                    : tokenBudget.status === 'warning'
                    ? 'bg-yellow-400'
                    : isRetrievalActive
                    ? 'bg-blue-400'
                    : 'bg-cyberLime'
                }`}
                style={{ width: `${Math.min(100, tokenBudget.usagePercentage)}%` }}
              />
            </div>

            {/* Context Subtitle / Explanation */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
              <span>
                Vault Total: <strong className="text-gray-300">{tokenBudget.rawVaultTokens.toLocaleString()}</strong> tokens
              </span>
              {isRetrievalActive ? (
                <span className="text-blue-400 font-mono">
                  BM25: Top-{tokenBudget.optimalChunkCount} chunks
                </span>
              ) : (
                <span className="text-cyberLime font-mono">100% Full Text</span>
              )}
            </div>

            {/* 1-Click Gemini 1M Switcher button if vault exceeds model limit */}
            {tokenBudget.canSwitchToGemini && (
              <button
                type="button"
                onClick={() => {
                  updateConfig({ aiProvider: AIProvider.GEMINI_DIRECT });
                  addToast('Switched to Gemini Direct (1 Million token window)!', 'success');
                }}
                className="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-cyberLime/10 hover:bg-cyberLime/20 border border-cyberLime/30 text-cyberLime text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(132,249,6,0.1)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Switch to Gemini 2.5 Flash (1M Window) for Full Ingestion</span>
              </button>
            )}
          </div>

          {/* Prompt Input */}
          <div className="flex-1 flex flex-col space-y-2 min-h-[160px]">
            <label className="text-xs font-mono text-gray-500 uppercase">
              {selectedMode === DraftMode.EXAM_MASTERY && 'Course Syllabus / Exam Focus Areas'}
              {selectedMode === DraftMode.THESIS && 'Research Topic / Problem Statement'}
              {selectedMode === DraftMode.LIT_REVIEW && 'Thematic Scope / Core Research Question'}
              {selectedMode === DraftMode.CUSTOM && 'Scholarly Instructions'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectedMode === DraftMode.EXAM_MASTERY
                  ? 'E.g., Generate a comprehensive master exam paper covering Chapters 1-4 with multi-step analytical problems...'
                  : selectedMode === DraftMode.THESIS
                  ? 'E.g., Comparative analysis of neural radiance fields versus photogrammetry...'
                  : selectedMode === DraftMode.LIT_REVIEW
                  ? 'E.g., Synthesize methodological approaches across all uploaded deep learning papers...'
                  : 'Describe exactly what scholarly synthesis you want...'
              }
              className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-gray-200 placeholder-gray-600 focus:border-deepViolet/50 focus:bg-black/60 outline-none resize-none font-sans leading-relaxed transition-all duration-300 text-xs"
            />
          </div>

          {/* Action Bar */}
          <div className="pt-1">
            <PrimaryButton
              onClick={handleGenerate}
              className={`w-full justify-center h-11 transition-all duration-300 text-xs ${
                state.isGenerating
                  ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:shadow-none'
                  : 'bg-cyberLime text-black font-bold'
              }`}
            >
              {state.isGenerating ? (
                <>
                  <StopCircle className="w-4 h-4 animate-pulse" />
                  Stop Generation
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate {getModeLabel(selectedMode)}
                </>
              )}
            </PrimaryButton>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
              <span className="text-gray-400">
                ENGINE:{' '}
                {config.aiProvider === AIProvider.GEMINI_DIRECT
                  ? 'GEMINI DIRECT'
                  : activeProfile?.name || 'OPENAI'}
              </span>
              <div className="flex items-center gap-1.5 text-cyberLime/80">
                <div className="w-1.5 h-1.5 rounded-full bg-cyberLime animate-pulse" />
                {documents.filter((d) => d.enabled !== false).length} ACTIVE SOURCE(S)
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Output */}
        <div
          ref={outputContainerRef}
          className="flex-1 bg-black/40 p-8 overflow-y-auto scroll-smooth print:p-0 print:bg-white"
        >
          {state.output || state.isGenerating ? (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4 print:max-w-none">
              <div className="flex justify-end mb-2 print:hidden">
                <button
                  onClick={() => setState((prev) => ({ ...prev, output: '' }))}
                  className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"
                >
                  <Eraser className="w-3 h-3" /> Clear Screen
                </button>
              </div>

              <GlassCard
                className={`p-10 min-h-[700px] bg-black/60 transition-all duration-500 print:bg-white print:border-none print:shadow-none print:p-0 ${
                  state.isGenerating ? 'shadow-glow-violet border-deepViolet/30' : ''
                }`}
              >
                <MarkdownRenderer content={state.output} isGenerating={state.isGenerating} />

                {/* Socratic Interactive Grading Component */}
                {selectedMode === DraftMode.EXAM_MASTERY && state.output && !state.isGenerating && (
                  <SocraticQuizPanel
                    studyContent={state.output}
                    onGradingComplete={(report) => setLatestExaminerReport(report)}
                  />
                )}
              </GlassCard>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 print:hidden">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 opacity-20 text-cyberLime" />
              </div>
              <p className="font-mono text-sm uppercase tracking-widest text-gray-400">
                Scholar Studio Prepared
              </p>
              <p className="text-xs opacity-50 max-w-sm text-center leading-relaxed">
                Mode: <span className="text-cyberLime">{getModeLabel(selectedMode)}</span>
                <br />
                Load your papers, lecture slides, or textbooks into the Context Vault and launch study generation.
              </p>
              {state.error && (
                <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md text-center">
                  {state.error}
                </div>
              )}
            </div>
          )}
          <div className="h-20 print:hidden" />
        </div>
      </div>
    </main>
  );
};
