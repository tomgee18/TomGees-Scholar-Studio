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
  ExternalLink,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sliders,
  Eye,
  Edit3,
  Columns,
  Quote,
  Wand2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { runDraftEngine, constructSystemPrompt } from '../lib/ai/draftEngine';
import { routeAIRequest } from '../lib/ai/aiRouter';
import { calculateTokenBudget } from '../lib/ai/tokenManager';
import { PrimaryButton, GlassCard } from './ui/GlassComponents';
import {
  DraftingState,
  DraftMode,
  AIProvider,
  DraftHistoryItem,
  ScholarlyPaper,
  DocumentContext,
} from '../types';
import { SettingsModal } from './SettingsModal';
import { DraftHistoryDrawer } from './DraftHistoryDrawer';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { SocraticQuizPanel } from './SocraticQuizPanel';
import { ExportHubModal } from './ExportHubModal';
import { ScholarCopilot } from './ScholarCopilot';
import { HelpModal } from './HelpModal';
import { DocumentInspectorModal } from './DocumentInspectorModal';
import { useToast } from '../context/ToastContext';

export type CanvasViewMode = 'preview' | 'edit' | 'split';

export const Workspace = () => {
  const {
    documents,
    activeWorkspace,
    getFullContextString,
    getRetrievedContextString,
    config,
    updateConfig,
    activeProfile,
    resolveProfileKey,
    saveDraftToHistory,
    addRawDocument,
  } = useStore();
  const { addToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<DraftMode>(DraftMode.EXAM_MASTERY);
  const [canvasMode, setCanvasMode] = useState<CanvasViewMode>('preview');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportHubOpen, setIsExportHubOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latestExaminerReport, setLatestExaminerReport] = useState('');
  const [groundedPapers, setGroundedPapers] = useState<ScholarlyPaper[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [savedPaperIds, setSavedPaperIds] = useState<Set<string>>(new Set());
  const [isPapersExpanded, setIsPapersExpanded] = useState<boolean>(true);

  // Citation Provenance Inspector state
  const [inspectingCitationDoc, setInspectingCitationDoc] = useState<DocumentContext | null>(null);
  const [inspectingCitationQuery, setInspectingCitationQuery] = useState<string>('');

  // Manuscript Canvas Selection & Cursor Tracking
  const manuscriptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [isTransformingSelection, setIsTransformingSelection] = useState(false);

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
        setSelectedSnippet(null);
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
    setState((prev) => {
      const current = prev.output || '';
      const sel = cursorSelectionRef.current;
      if (sel && sel.start >= 0 && sel.start <= current.length) {
        const before = current.slice(0, sel.start);
        const after = current.slice(sel.end);
        const inserted = `${before}\n${text}\n${after}`;
        const newPos = before.length + text.length + 2;
        cursorSelectionRef.current = { start: newPos, end: newPos };
        return { ...prev, output: inserted };
      }
      return {
        ...prev,
        output: current ? `${current}\n\n${text}` : text,
      };
    });
    addToast('Inserted at manuscript cursor', 'success');
  };

  const handleAppendToDraft = (text: string) => {
    setState((prev) => ({
      ...prev,
      output: prev.output ? `${prev.output}\n\n${text}` : text,
    }));
    addToast('Appended to manuscript', 'success');
  };

  const handleCitationClick = (sourceQuery: string) => {
    const clean = sourceQuery.trim();
    const lower = clean.toLowerCase();
    const matchedDoc =
      documents.find(
        (d) =>
          d.name.toLowerCase() === lower ||
          lower.includes(d.name.toLowerCase()) ||
          d.name.toLowerCase().includes(lower.split(',')[0].trim())
      ) || documents.find((d) => d.enabled !== false) || documents[0];

    if (matchedDoc) {
      const sectionMatch = clean.match(/Section\s*#?(\d+)/i);
      const searchHint = sectionMatch ? '' : clean.replace(/^.*?(?:from|:)\s*/i, '').slice(0, 32);
      setInspectingCitationDoc(matchedDoc);
      setInspectingCitationQuery(
        matchedDoc.name.toLowerCase().includes(searchHint.toLowerCase()) ? '' : searchHint
      );
      addToast(`Inspecting provenance in "${matchedDoc.name}"`, 'info');
    } else {
      addToast(`Citation "${clean}" — no matching file in active Context Vault`, 'info');
    }
  };

  const handleManuscriptSelection = () => {
    const el = manuscriptTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    cursorSelectionRef.current = { start, end };

    if (end - start >= 10) {
      const highlighted = state.output.slice(start, end).trim();
      if (highlighted.length >= 10) {
        setSelectedSnippet({ text: highlighted, start, end });
        return;
      }
    }
    setSelectedSnippet(null);
  };

  const handlePreviewMouseUp = () => {
    if (canvasMode === 'edit') return;
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim() || '';
    if (selectedText.length >= 12 && state.output) {
      const idx = state.output.indexOf(selectedText);
      const start = idx !== -1 ? idx : 0;
      const end = idx !== -1 ? idx + selectedText.length : 0;
      setSelectedSnippet({ text: selectedText, start, end });
    }
  };

  const handleSelectionTransform = async (
    action: 'cite' | 'expand' | 'rewrite'
  ) => {
    if (!selectedSnippet || isTransformingSelection) return;
    setIsTransformingSelection(true);

    const vaultSnippet = await getRetrievedContextString(selectedSnippet.text, 6);
    const papersSnippet =
      groundedPapers.length > 0
        ? groundedPapers
            .map((p) => `- ${p.title} (${p.authors.join(', ')}, ${p.year || 'n.d.'}) DOI: ${p.doi || 'N/A'}`)
            .join('\n')
        : '';

    const instructionMap = {
      cite: `Add accurate inline scholarly citations (e.g., [Source: filename] for Vault sources or (Author, Year) with DOI for Grounded Papers) directly to the following passage based on the provided evidence. Output ONLY the revised passage in Markdown without commentary.`,
      expand: `Expand and deepen the following passage into a rigorous, well-evidenced academic paragraph using specific mechanisms, data, and citations ([Source: filename]) from the provided Context Vault and Grounded Papers. Output ONLY the replacement prose in Markdown.`,
      rewrite: `Rewrite the following passage to elevate its clarity, academic precision, and argumentative rigor while preserving its factual meaning and citations. Output ONLY the polished replacement passage in Markdown.`,
    };

    const transformPrompt = `${instructionMap[action]}

SELECTED PASSAGE:
"""
${selectedSnippet.text}
"""

AVAILABLE VAULT EVIDENCE:
"""
${vaultSnippet || 'No active vault chunks matched.'}
"""

GROUNDED LITERATURE:
"""
${papersSnippet || 'None'}
"""`;

    let replacement = '';
    try {
      const effectiveProfile = activeProfile
        ? { ...activeProfile, apiKey: resolveProfileKey(activeProfile) }
        : undefined;

      await routeAIRequest({
        provider: config.aiProvider,
        activeProfile: effectiveProfile,
        systemPrompt:
          'You are an Academic Manuscript Editor. Return only the drop-in replacement Markdown text without introductory or concluding remarks.',
        userPrompt: transformPrompt,
        config: {
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
        },
        onChunk: (chunk) => {
          replacement += chunk;
        },
      });

      const cleanedReplacement = replacement.trim();
      if (cleanedReplacement) {
        setState((prev) => {
          const current = prev.output;
          if (
            selectedSnippet.end > selectedSnippet.start &&
            current.slice(selectedSnippet.start, selectedSnippet.end).includes(selectedSnippet.text.slice(0, 15))
          ) {
            return {
              ...prev,
              output:
                current.slice(0, selectedSnippet.start) +
                cleanedReplacement +
                current.slice(selectedSnippet.end),
            };
          }
          const idx = current.indexOf(selectedSnippet.text);
          if (idx !== -1) {
            return {
              ...prev,
              output:
                current.slice(0, idx) +
                cleanedReplacement +
                current.slice(idx + selectedSnippet.text.length),
            };
          }
          return { ...prev, output: `${current}\n\n${cleanedReplacement}` };
        });
        setSelectedSnippet(null);
        addToast('Selection updated in Manuscript Canvas', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to refine selection', 'error');
    } finally {
      setIsTransformingSelection(false);
    }
  };

  const handleSavePaperToVault = async (paper: ScholarlyPaper) => {
    try {
      const paperContent = `# ${paper.title}

- **Authors**: ${paper.authors.join(', ')}
- **Year**: ${paper.year || 'Unknown'}
- **Source**: ${paper.journal || paper.source.toUpperCase()}
${paper.doi ? `- **DOI**: https://doi.org/${paper.doi}` : ''}
${paper.url ? `- **URL**: ${paper.url}` : ''}

## Abstract
${paper.abstract || 'No abstract record provided in public repository.'}
`;
      const docName = `${paper.title.slice(0, 40).replace(/[^\w\s-]/g, '')}.md`;
      await addRawDocument(docName, paperContent, 'md');
      setSavedPaperIds((prev) => new Set(prev).add(paper.id));
      addToast(`Saved "${paper.title.slice(0, 30)}..." to Context Vault`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save paper to vault', 'error');
    }
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
    const isStrict = typeof config.strictGrounding === 'boolean' ? config.strictGrounding : true;
    const effectiveInstructions = activeProfile?.customInstructions?.trim() || config.customSystemPrompt;
    const systemPrompt = constructSystemPrompt(
      effectiveInstructions,
      selectedMode,
      config.webAccessEnabled,
      vaultText,
      undefined,
      isStrict
    );
    const activeModelName =
      config.aiProvider === AIProvider.GEMINI_DIRECT
        ? config.geminiModel
        : activeProfile?.model || 'gpt-4o';

    const overrideLimit =
      config.aiProvider === AIProvider.GEMINI_DIRECT
        ? undefined
        : activeProfile?.contextWindow;

    const budget = calculateTokenBudget(
      systemPrompt,
      vaultText,
      prompt,
      activeModelName,
      config.forceSmartRetrieval,
      overrideLimit
    );

    return { tokenBudget: budget, isRetrievalActive: budget.isRAGActive };
  }, [
    getFullContextString,
    config.customSystemPrompt,
    config.strictGrounding,
    activeProfile?.customInstructions,
    activeProfile?.contextWindow,
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
    setGroundedPapers([]);
    setGenerationStatus('');

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
          strictGrounding: config.strictGrounding,
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
        onStatusUpdate: (status) => {
          if (isMounted.current) setGenerationStatus(status);
        },
        onGroundedPapers: (papers) => {
          if (isMounted.current) setGroundedPapers(papers);
        },
        signal: abortControllerRef.current.signal,
      });

      if (isMounted.current) {
        setState((prev) => ({ ...prev, isGenerating: false }));
        setGenerationStatus('');
      }

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
          groundedPapers,
        });
        addToast('Study suite saved to history', 'success');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        if (isMounted.current) {
          setState((prev) => ({ ...prev, isGenerating: false }));
          setGenerationStatus('');
        }
        return;
      }

      if (isMounted.current) {
        const errorMsg = err.message || 'An unexpected error occurred.';
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMsg,
        }));
        setGenerationStatus('');
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
    setGroundedPapers(draft.groundedPapers || []);
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
      <DocumentInspectorModal
        document={inspectingCitationDoc}
        initialSearchTerm={inspectingCitationQuery}
        onClose={() => {
          setInspectingCitationDoc(null);
          setInspectingCitationQuery('');
        }}
      />
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
        groundedPapers={groundedPapers}
        vaultDocuments={documents}
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
            <span className="text-[11px] font-mono font-normal px-2.5 py-0.5 rounded-full bg-cyberLime/10 text-cyberLime border border-cyberLime/30">
              {activeWorkspace.name}
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            ADVANCED SCHOLARLY RESEARCH & EXAM ENGINE
          </p>
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

          {/* Augmentations: OER, Retrieval & Strict Grounding */}
          <div className="space-y-2">
            <button
              onClick={() => updateConfig({ webAccessEnabled: !config.webAccessEnabled })}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs transition-all ${
                config.webAccessEnabled
                  ? 'bg-cyberLime/10 border-cyberLime/50 text-white shadow-[0_0_10px_rgba(132,249,6,0.1)]'
                  : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className={`w-3.5 h-3.5 ${config.webAccessEnabled ? 'text-cyberLime' : 'text-gray-500'}`} />
                <div className="text-left">
                  <div className="font-medium">Scholarly Web Grounding</div>
                  <div className="text-[10px] opacity-60">
                    {config.webAccessEnabled ? 'Live arXiv, Crossref & Semantic Scholar' : '100% Offline Vault Mode'}
                  </div>
                </div>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full border ${
                  config.webAccessEnabled ? 'bg-cyberLime border-cyberLime' : 'bg-transparent border-gray-600'
                }`}
              />
            </button>

            {/* Strict Grounding Anti-Hallucination Switcher */}
            <button
              onClick={() => updateConfig({ strictGrounding: !(typeof config.strictGrounding === 'boolean' ? config.strictGrounding : true) })}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg border text-xs transition-all ${
                (typeof config.strictGrounding === 'boolean' ? config.strictGrounding : true)
                  ? 'bg-cyberLime/10 border-cyberLime/40 text-white shadow-[0_0_10px_rgba(132,249,6,0.1)]'
                  : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-3.5 h-3.5 ${(typeof config.strictGrounding === 'boolean' ? config.strictGrounding : true) ? 'text-cyberLime' : 'text-gray-500'}`} />
                <div className="text-left">
                  <div className="font-medium">Strict Grounding (Anti-Hallucination)</div>
                  <div className="text-[10px] opacity-60">
                    {(typeof config.strictGrounding === 'boolean' ? config.strictGrounding : true) ? 'Zero Extrapolation / No Implied Answers (T=0.15)' : 'Creative / Extrapolative Mode'}
                  </div>
                </div>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full border ${
                  (typeof config.strictGrounding === 'boolean' ? config.strictGrounding : true) ? 'bg-cyberLime border-cyberLime' : 'bg-transparent border-gray-600'
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
                    {isRetrievalActive ? `Injecting Top-${tokenBudget.optimalChunkCount} most relevant chunks` : 'Injecting 100% of enabled files'}
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
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="hover:underline flex items-center gap-1.5 transition-colors group"
                title="Click to adjust model context window in Settings"
              >
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
                <Sliders className="w-3 h-3 text-gray-500 group-hover:text-cyberLime transition-colors" />
              </button>
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
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-gray-500">
                  [{tokenBudget.maxContextTokens >= 1000000 ? '1M' : `${Math.round(tokenBudget.maxContextTokens / 1024)}k`} Window]
                </span>
                {isRetrievalActive ? (
                  <span className="text-blue-400 font-mono">
                    Top-{tokenBudget.optimalChunkCount} chunks
                  </span>
                ) : (
                  <span className="text-cyberLime font-mono">100% Full Text</span>
                )}
              </div>
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
          {state.output || state.isGenerating || canvasMode !== 'preview' ? (
            <div
              className={`${canvasMode === 'split' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4 print:max-w-none`}
            >
              {state.isGenerating && generationStatus && (
                <div className="mb-3 px-4 py-2.5 rounded-xl bg-cyberLime/10 border border-cyberLime/30 text-cyberLime text-xs font-mono flex items-center gap-2.5 animate-pulse shadow-[0_0_15px_rgba(132,249,6,0.15)] print:hidden">
                  <Globe className="w-4 h-4 text-cyberLime animate-spin" />
                  <span className="font-semibold">{generationStatus}</span>
                </div>
              )}

              {/* Manuscript Canvas Mode Switcher & Metrics Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setCanvasMode('preview')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                      canvasMode === 'preview'
                        ? 'bg-cyberLime text-black font-bold shadow-glow-lime'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Rendered Academic Preview"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button
                    onClick={() => setCanvasMode('edit')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                      canvasMode === 'edit'
                        ? 'bg-electricCyan text-black font-bold shadow-glow-cyan'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Direct Markdown Manuscript Editor (Cursor-Aware)"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Canvas
                  </button>
                  <button
                    onClick={() => setCanvasMode('split')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                      canvasMode === 'split'
                        ? 'bg-deepViolet text-white font-bold shadow-glow-violet'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Side-by-Side Split Markdown & Live Preview"
                  >
                    <Columns className="w-3.5 h-3.5" /> Split Studio
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded border border-white/5">
                    {state.output.trim() ? state.output.trim().split(/\s+/).length : 0} words
                  </span>
                  <button
                    onClick={() => {
                      setState((prev) => ({ ...prev, output: '' }));
                      setSelectedSnippet(null);
                    }}
                    className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Eraser className="w-3 h-3" /> Clear Screen
                  </button>
                </div>
              </div>

              {/* Inline Selection Action Bar */}
              {selectedSnippet && (
                <div className="mb-3 p-2.5 rounded-xl bg-surfaceHighlight/95 border border-electricCyan/30 shadow-glow-cyan flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 print:hidden">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Wand2 className="w-4 h-4 text-electricCyan shrink-0" />
                    <span className="text-[11px] font-mono text-gray-300 truncate">
                      Selected:{' '}
                      <strong className="text-white">
                        &ldquo;{selectedSnippet.text.slice(0, 75)}
                        {selectedSnippet.text.length > 75 ? '...' : ''}&rdquo;
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSelectionTransform('cite')}
                      disabled={isTransformingSelection || state.isGenerating}
                      className="px-2.5 py-1 rounded-lg bg-electricCyan/15 hover:bg-electricCyan/25 text-electricCyan border border-electricCyan/30 text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                      title="Verify and attach inline [Source: Document Name] citations to this selection"
                    >
                      <Quote className="w-3 h-3" /> Cite Claim
                    </button>
                    <button
                      onClick={() => handleSelectionTransform('expand')}
                      disabled={isTransformingSelection || state.isGenerating}
                      className="px-2.5 py-1 rounded-lg bg-cyberLime/15 hover:bg-cyberLime/25 text-cyberLime border border-cyberLime/30 text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                      title="Deepen and expand this passage using Vault evidence"
                    >
                      <Sparkles className="w-3 h-3" /> Expand with Vault
                    </button>
                    <button
                      onClick={() => handleSelectionTransform('rewrite')}
                      disabled={isTransformingSelection || state.isGenerating}
                      className="px-2.5 py-1 rounded-lg bg-deepViolet/20 hover:bg-deepViolet/35 text-purple-300 border border-deepViolet/40 text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                      title="Tighten into rigorous peer-reviewed academic prose"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTransformingSelection ? 'animate-spin' : ''}`} /> Academic Polish
                    </button>
                    <button
                      onClick={() => {
                        setIsCopilotOpen(true);
                        addToast('Selection active — ask Scholar Copilot to critique or refine it.', 'info');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <BookOpen className="w-3 h-3" /> Ask Copilot
                    </button>
                    <button
                      onClick={() => setSelectedSnippet(null)}
                      className="p-1 text-gray-500 hover:text-white rounded"
                      title="Dismiss selection toolbar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <GlassCard
                className={`p-8 min-h-[700px] bg-black/60 transition-all duration-500 print:bg-white print:border-none print:shadow-none print:p-0 ${
                  state.isGenerating ? 'shadow-glow-violet border-deepViolet/30' : ''
                }`}
              >
                {canvasMode === 'preview' && (
                  <div onMouseUp={handlePreviewMouseUp}>
                    <MarkdownRenderer
                      content={state.output}
                      isGenerating={state.isGenerating}
                      onCitationClick={handleCitationClick}
                    />
                  </div>
                )}

                {canvasMode === 'edit' && (
                  <div className="flex flex-col h-full min-h-[640px]">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-[11px] text-gray-400 font-mono">
                      <span>
                        MARKDOWN MANUSCRIPT CANVAS • Highlight text for AI actions or place cursor for Copilot insertion
                      </span>
                      <span className="text-electricCyan">Cursor Tracking Active</span>
                    </div>
                    <textarea
                      ref={manuscriptTextareaRef}
                      value={state.output}
                      onChange={(e) => setState((prev) => ({ ...prev, output: e.target.value }))}
                      onSelect={handleManuscriptSelection}
                      onKeyUp={handleManuscriptSelection}
                      onMouseUp={handleManuscriptSelection}
                      placeholder="Write or edit your academic manuscript in Markdown... Place your cursor anywhere and click 'Insert at Cursor' inside Scholar Copilot to weave paragraphs seamlessly."
                      className="w-full flex-1 min-h-[600px] bg-transparent text-gray-100 font-mono text-sm leading-relaxed focus:outline-none resize-y selection:bg-electricCyan/30 selection:text-white"
                    />
                  </div>
                )}

                {canvasMode === 'split' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[640px]">
                    <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-[10px] text-electricCyan font-mono uppercase tracking-wider">
                        <span>Markdown Source (Cursor-Aware)</span>
                        <span>Highlight to Transform</span>
                      </div>
                      <textarea
                        ref={manuscriptTextareaRef}
                        value={state.output}
                        onChange={(e) => setState((prev) => ({ ...prev, output: e.target.value }))}
                        onSelect={handleManuscriptSelection}
                        onKeyUp={handleManuscriptSelection}
                        onMouseUp={handleManuscriptSelection}
                        placeholder="Write or edit Markdown source..."
                        className="w-full flex-1 min-h-[580px] bg-black/30 p-3 rounded-lg border border-white/5 text-gray-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-electricCyan/40 resize-y selection:bg-electricCyan/30"
                      />
                    </div>
                    <div className="flex flex-col" onMouseUp={handlePreviewMouseUp}>
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-[10px] text-cyberLime font-mono uppercase tracking-wider">
                        <span>Live Scholarly Render</span>
                        <span>Click [Source: ...] to Inspect</span>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <MarkdownRenderer
                          content={state.output}
                          isGenerating={state.isGenerating}
                          onCitationClick={handleCitationClick}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Verified Scholarly Literature Grounding Panel */}
                {groundedPapers.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/10 print:hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyberLime" />
                        <h4 className="text-sm font-bold text-white tracking-wide">
                          Verified Academic Literature ({groundedPapers.length} Grounded Papers)
                        </h4>
                        <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          Crossref • arXiv • Semantic Scholar
                        </span>
                      </div>
                      <button
                        onClick={() => setIsPapersExpanded(!isPapersExpanded)}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <span>{isPapersExpanded ? 'Collapse' : 'Expand'}</span>
                        {isPapersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isPapersExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {groundedPapers.map((paper) => {
                          const isSaved = savedPaperIds.has(paper.id);
                          return (
                            <div
                              key={paper.id}
                              className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-cyberLime/30 transition-all flex flex-col justify-between gap-2.5 group"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${
                                    paper.source === 'crossref'
                                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                      : paper.source === 'arxiv'
                                      ? 'bg-red-500/15 border-red-500/30 text-red-300'
                                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  }`}>
                                    {paper.source}
                                  </span>
                                  {paper.year && (
                                    <span className="text-[10px] font-mono text-gray-400">
                                      {paper.year}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-semibold text-white group-hover:text-cyberLime transition-colors line-clamp-2 leading-snug">
                                  {paper.title}
                                </h5>
                                <p className="text-[10px] text-gray-400 line-clamp-1">
                                  {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                                </p>
                                {paper.abstract && (
                                  <p className="text-[10px] text-gray-400 line-clamp-2 italic opacity-80 pt-0.5">
                                    "{paper.abstract}"
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                                {paper.doi ? (
                                  <a
                                    href={`https://doi.org/${paper.doi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyberLime hover:underline flex items-center gap-1 font-mono"
                                  >
                                    <span>DOI: {paper.doi.slice(0, 18)}...</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : paper.url ? (
                                  <a
                                    href={paper.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyberLime hover:underline flex items-center gap-1 font-mono"
                                  >
                                    <span>arXiv Link</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : (
                                  <span className="text-gray-500">Indexed Record</span>
                                )}

                                <button
                                  onClick={() => handleSavePaperToVault(paper)}
                                  disabled={isSaved}
                                  className={`px-2 py-1 rounded-md text-[10px] flex items-center gap-1 transition-all ${
                                    isSaved
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                                      : 'bg-white/5 hover:bg-cyberLime/20 text-gray-300 hover:text-cyberLime border border-white/10 hover:border-cyberLime/40'
                                  }`}
                                  title={isSaved ? 'Already saved in Vault' : 'Save paper abstract to Context Vault'}
                                >
                                  {isSaved ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>Saved</span>
                                    </>
                                  ) : (
                                    <>
                                      <BookmarkPlus className="w-3 h-3" />
                                      <span>Save to Vault</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

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
