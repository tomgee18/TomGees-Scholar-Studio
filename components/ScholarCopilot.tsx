import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  X,
  Send,
  Square,
  FileText,
  Database,
  Copy,
  Check,
  CornerDownLeft,
  PlusCircle,
  Trash2,
  RotateCcw,
  Bot,
  User,
  Globe,
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { AIProvider, ChatMessage, OpenAIProfile } from '../types';
import { routeAIRequest } from '../lib/ai/aiRouter';
import { searchScholarlyLiterature, formatPapersForContext } from '../lib/ai/scholarlyClient';
import { db } from '../lib/db';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { getModelContextLimit, getOptimalChunkCount } from '../lib/ai/tokenManager';

interface ScholarCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftText: string;
  onInsertAtCursor?: (text: string) => void;
  onAppendToDraft?: (text: string) => void;
}

const AGENTIC_SKILL_CHIPS = [
  {
    label: 'Lit Discovery',
    icon: BookOpen,
    color: 'text-cyberLime border-cyberLime/30 bg-cyberLime/10',
    prompt: 'Execute Literature Discovery: Search arXiv, Crossref, and Semantic Scholar for foundational and cutting-edge papers on our core topic. Synthesize key theoretical findings, methodological approaches, and research gaps with authentic DOIs.',
  },
  {
    label: 'Ground Citations',
    icon: CheckCircle2,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    prompt: 'Execute Citation & DOI Grounding: Audit claims in my active draft, locate authentic peer-reviewed studies from Crossref and arXiv, and provide revised sentences with verified author-year citations and clickable DOI links.',
  },
  {
    label: 'Counterarguments',
    icon: ShieldAlert,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    prompt: 'Execute Counterargument & Critique Search: Find published peer-reviewed papers presenting opposing viewpoints, contradictory empirical findings, or theoretical critiques to our thesis argument to fortify our dissertation defense.',
  },
  {
    label: 'Methodology Audit',
    icon: Cpu,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    prompt: 'Execute Methodology & Benchmark Audit: Search scholarly literature for established empirical frameworks, standard benchmark datasets, and evaluation metrics used in peer-reviewed dissertations on this subject.',
  },
];

const QUICK_PROMPT_CHIPS = [
  { label: 'Critique Draft', prompt: 'Critique my active draft. Identify any weak arguments, logical gaps, or unsupported claims, and suggest rigorous academic enhancements.' },
  { label: 'Fact-Check vs Sources', prompt: 'Examine my draft against the source materials in our vault. Point out any factual inconsistencies or missing citations.' },
  { label: 'Suggest Next Section', prompt: 'Based on the trajectory and arguments of my draft so far, outline the next logical section with academic headers and key points.' },
  { label: 'Simplify & Polish', prompt: 'Review my draft for readability, clarity, and conciseness while retaining graduate-level academic prose.' },
];

export const ScholarCopilot: React.FC<ScholarCopilotProps> = ({
  isOpen,
  onClose,
  activeDraftText,
  onInsertAtCursor,
  onAppendToDraft,
}) => {
  const {
    config,
    activeProfile,
    resolveProfileKey,
    getRetrievedContextString,
    documents,
    updateConfig,
  } = useStore();

  const [conversationId, setConversationId] = useState<string>('default-thread');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [includeDraft, setIncludeDraft] = useState(true);
  const [searchVault, setSearchVault] = useState(true);
  const [searchOpenWeb, setSearchOpenWeb] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // In-chat provider/profile selection
  const [chatProvider, setChatProvider] = useState<AIProvider>(config.aiProvider);
  const [chatProfileId, setChatProfileId] = useState<string>(config.activeProfileId);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync provider choices when global config changes
  useEffect(() => {
    setChatProvider(config.aiProvider);
    setChatProfileId(config.activeProfileId);
  }, [config.aiProvider, config.activeProfileId]);

  // Load chat history for current conversation
  const loadMessages = useCallback(async () => {
    try {
      const stored = await db.chatMessages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('timestamp');
      setMessages(stored);
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (text: string) => {
    if (onInsertAtCursor) {
      onInsertAtCursor(text);
      setActionNotice('Inserted at cursor!');
      setTimeout(() => setActionNotice(null), 2000);
    }
  };

  const handleAppend = (text: string) => {
    if (onAppendToDraft) {
      onAppendToDraft(text);
      setActionNotice('Appended to draft!');
      setTimeout(() => setActionNotice(null), 2000);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history in this thread?')) return;
    try {
      await db.chatMessages.where('conversationId').equals(conversationId).delete();
      setMessages([]);
      setStreamingResponse('');
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  const handleNewThread = () => {
    const newId = `thread-${Date.now()}`;
    setConversationId(newId);
    setMessages([]);
    setStreamingResponse('');
    setActionNotice('Started fresh conversation thread');
    setTimeout(() => setActionNotice(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isGenerating) return;

    setInputText('');
    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      conversationId,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    await db.chatMessages.add(userMsg);

    setIsGenerating(true);
    setStreamingResponse('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const sourcesUsed: string[] = [];
    let contextBlock = '';

    // Step 1: Draft Awareness
    if (includeDraft && activeDraftText.trim()) {
      const draftExcerpt = activeDraftText.length > 5000 
        ? activeDraftText.slice(0, 5000) + '\n\n[...draft truncated for context efficiency...]' 
        : activeDraftText;
      contextBlock += `\n\n=== USER ACTIVE DRAFT ===\n${draftExcerpt}\n=== END ACTIVE DRAFT ===\n`;
    }

    // Step 2: Vault BM25 Retrieval
    if (searchVault && documents.some((d) => d.enabled !== false)) {
      try {
        const targetModelName =
          chatProvider === AIProvider.GEMINI_DIRECT
            ? config.geminiModel
            : (config.profiles.find((p) => p.id === chatProfileId) || activeProfile)?.model || 'default-model';
        const dynamicChunks = getOptimalChunkCount(getModelContextLimit(targetModelName));
        const retrieved = await getRetrievedContextString(prompt, dynamicChunks);
        if (retrieved.trim()) {
          contextBlock += `\n\n=== RETRIEVED VAULT SOURCES ===\n${retrieved}\n=== END VAULT SOURCES ===\n`;
          sourcesUsed.push(...documents.filter((d) => d.enabled !== false).map((d) => d.name));
        }
      } catch (err) {
        console.warn('Vault retrieval failed for chat message:', err);
      }
    }

    // Step 3: Open Scholarly Web Grounding (arXiv, Crossref, Semantic Scholar)
    if (searchOpenWeb) {
      try {
        const webQuery = prompt
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3 && !['execute', 'please', 'suggest', 'review', 'critique', 'draft', 'write'].includes(w.toLowerCase()))
          .slice(0, 6)
          .join(' ') || prompt.slice(0, 50);

        const papers = await searchScholarlyLiterature(webQuery, 4);
        if (papers.length > 0) {
          contextBlock += `\n\n${formatPapersForContext(papers)}\n`;
          sourcesUsed.push(...papers.map((p) => `${p.title.slice(0, 30)}... (${p.source.toUpperCase()})`));
        }
      } catch (err) {
        console.warn('Copilot open web literature search failed:', err);
      }
    }

    // Determine target profile and model
    const targetProfile: OpenAIProfile | undefined =
      chatProvider === AIProvider.OPENAI_COMPATIBLE
        ? config.profiles.find((p) => p.id === chatProfileId) || activeProfile
        : undefined;

    const resolvedApiKey = targetProfile ? resolveProfileKey(targetProfile) : '';
    const activeProfileWithKey = targetProfile
      ? { ...targetProfile, apiKey: resolvedApiKey }
      : undefined;

    const modelName =
      chatProvider === AIProvider.GEMINI_DIRECT
        ? config.geminiModel || 'gemini-2.5-flash'
        : targetProfile?.model || 'default-model';

    const isStrictGrounding =
      typeof config.strictGrounding === 'boolean'
        ? config.strictGrounding
        : typeof targetProfile?.strictGrounding === 'boolean'
        ? targetProfile.strictGrounding
        : false;

    const strictGroundingDirective = isStrictGrounding
      ? `\n[STRICT FACTUAL GROUNDING: NO IMPLIED ANSWERS]
- Strictly anchor every claim, critique, and suggestion in the provided Active Draft, Vault Sources, and Verified Scholarly Literature.
- Do NOT provide implied, guessed, or extrapolated answers from pre-trained priors. If information is missing from the provided sources, explicitly state: "[Source Gap: Not in provided materials]".`
      : '';

    const effectiveInstructions = targetProfile?.customInstructions?.trim() || config.customSystemPrompt;

    const copilotSystemPrompt = `${effectiveInstructions}

You are the "Scholar Copilot", a peer-level academic research collaborator, literature investigator, and co-author.
Your role is to assist the scholar with critique, source synthesis, argumentation, citation verification, and precise drafting.
Be concise, rigorous, scholarly, and insightful. When asked to write or improve text, provide drop-in ready prose.
${strictGroundingDirective}
${contextBlock ? `\nRefer directly to the provided Active Draft, Vault Sources, and Verified Scholarly Literature where relevant. Cite authentic DOIs when referencing external literature.` : ''}`;

    // Compile multi-turn history
    const historyPayload = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const finalUserContent = contextBlock
      ? `${prompt}\n\n[Context Injected Below for Reference]${contextBlock}`
      : prompt;

    const fullMessages = [
      { role: 'system' as const, content: copilotSystemPrompt },
      ...historyPayload,
      { role: 'user' as const, content: finalUserContent },
    ];

    let accumulatedText = '';

    try {
      await routeAIRequest({
        provider: chatProvider,
        activeProfile: activeProfileWithKey,
        messages: fullMessages,
        temperature: isStrictGrounding ? 0.15 : 0.7,
        config: {
          geminiApiKey: config.geminiApiKey,
          geminiModel: config.geminiModel,
        },
        onChunk: (chunk) => {
          accumulatedText += chunk;
          setStreamingResponse(accumulatedText);
        },
        signal: abortController.signal,
      });

      const assistantMsgId = `msg-asst-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        conversationId,
        role: 'assistant',
        content: accumulatedText,
        timestamp: Date.now(),
        sources: sourcesUsed.length > 0 ? sourcesUsed : undefined,
        modelUsed: modelName,
        providerUsed: chatProvider,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await db.chatMessages.add(assistantMsg);
    } catch (err: any) {
      if (abortController.signal.aborted) {
        console.warn('Copilot request aborted by user');
      } else {
        const errorMsgId = `msg-err-${Date.now()}`;
        const errorMsg: ChatMessage = {
          id: errorMsgId,
          conversationId,
          role: 'assistant',
          content: `⚠️ **Generation Error**: ${err?.message || 'Failed to generate response. Please check API keys and connection.'}`,
          timestamp: Date.now(),
          modelUsed: modelName,
          providerUsed: chatProvider,
        };
        setMessages((prev) => [...prev, errorMsg]);
        await db.chatMessages.add(errorMsg);
      }
    } finally {
      setIsGenerating(false);
      setStreamingResponse('');
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const draftWordCount = activeDraftText.trim()
    ? activeDraftText.trim().split(/\s+/).length
    : 0;

  return (
    <aside
      className="fixed top-0 right-0 h-full w-[440px] max-w-[95vw] bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-40 text-gray-200 transition-transform duration-300 ease-in-out"
      aria-label="Scholar Copilot Drawer"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">Scholar Copilot</h2>
            <p className="text-[11px] text-gray-400">Collaborative Academic Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleNewThread}
            title="Start New Thread"
            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearHistory}
            title="Clear Thread History"
            className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Copilot (Alt+C)"
            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-Chat Model & Provider Selector */}
      <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex items-center justify-between text-xs">
        <span className="text-gray-400 flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          Model:
        </span>
        <div className="flex items-center gap-2">
          <select
            value={chatProvider === AIProvider.GEMINI_DIRECT ? 'gemini' : chatProfileId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'gemini') {
                setChatProvider(AIProvider.GEMINI_DIRECT);
                updateConfig({ aiProvider: AIProvider.GEMINI_DIRECT });
              } else {
                setChatProvider(AIProvider.OPENAI_COMPATIBLE);
                setChatProfileId(val);
                updateConfig({
                  aiProvider: AIProvider.OPENAI_COMPATIBLE,
                  activeProfileId: val,
                });
              }
            }}
            className="bg-gray-800 border border-white/10 text-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="gemini">Google Gemini Direct ({config.geminiModel})</option>
            {config.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.model})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Context Awareness Toggles */}
      <div className="px-4 py-2 border-b border-white/5 bg-white/[0.01] flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIncludeDraft(!includeDraft)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
            includeDraft
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-300'
          }`}
          title="Toggle inclusion of active draft text in context"
        >
          <FileText className="w-3 h-3" />
          <span>Active Draft</span>
          <span className="text-[10px] opacity-70">({draftWordCount}w)</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchVault(!searchVault)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
            searchVault
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-300'
          }`}
          title="Toggle BM25 retrieval from uploaded document vault"
        >
          <Database className="w-3 h-3" />
          <span>Vault RAG</span>
          <span className="text-[10px] opacity-70">
            ({documents.filter((d) => d.enabled !== false).length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSearchOpenWeb(!searchOpenWeb)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
            searchOpenWeb
              ? 'bg-cyberLime/20 border-cyberLime/40 text-cyberLime'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-300'
          }`}
          title="Toggle live scholarly grounding via arXiv, Crossref, and Semantic Scholar"
        >
          <Globe className="w-3 h-3" />
          <span>Scholarly Web</span>
          <span className="text-[10px] opacity-70">(arXiv/Crossref)</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="px-4 py-1.5 bg-indigo-600/30 border-b border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between">
          <span>{actionNotice}</span>
          <Check className="w-3.5 h-3.5 text-indigo-400" />
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 && !streamingResponse && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6 text-gray-400 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-white text-sm">Scholar Copilot Active</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
                Ground your thesis with authentic peer-reviewed literature, audit citations, or explore counterarguments.
              </p>
            </div>

            {/* Agentic Skills Palette */}
            <div className="w-full flex flex-col gap-2 pt-2 text-left">
              <span className="text-[10px] font-mono font-bold text-cyberLime uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Agentic Research Skills
              </span>
              <div className="grid grid-cols-2 gap-2">
                {AGENTIC_SKILL_CHIPS.map((skill, idx) => {
                  const Icon = skill.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(skill.prompt)}
                      className={`text-left p-2.5 rounded-xl border transition-all text-xs hover:scale-[1.02] active:scale-[0.98] ${skill.color}`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate">{skill.label}</span>
                      </div>
                      <p className="text-[10px] opacity-75 line-clamp-2">
                        {skill.prompt.split(':')[1]?.trim() || skill.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Starters */}
            <div className="w-full flex flex-col gap-2 pt-1 text-left">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                Quick Drafting Prompts
              </span>
              <div className="space-y-1.5">
                {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.prompt)}
                    className="w-full text-left p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/30 text-gray-300 transition-all text-xs"
                  >
                    <span className="font-medium text-indigo-300 block text-xs">{chip.label}</span>
                    <span className="text-[10px] text-gray-400 line-clamp-1">{chip.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-gray-500">
              {msg.role === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-indigo-400" />
                  <span className="text-indigo-300 font-mono">{msg.modelUsed || 'Scholar AI'}</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/30 border border-indigo-500/30 text-white rounded-tr-sm'
                  : 'bg-white/[0.04] border border-white/10 text-gray-200 rounded-tl-sm shadow-md w-full'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
            </div>

            {/* Assistant Response Actions */}
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[11px] text-gray-400">
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5"
                  title="Copy response markdown"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                </button>

                {onInsertAtCursor && (
                  <button
                    onClick={() => handleInsert(msg.content)}
                    className="hover:text-indigo-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-indigo-500/10"
                    title="Insert directly at editor cursor"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                    <span>Insert</span>
                  </button>
                )}

                {onAppendToDraft && (
                  <button
                    onClick={() => handleAppend(msg.content)}
                    className="hover:text-emerald-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-emerald-500/10"
                    title="Append to bottom of draft"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Append</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Live Streaming Response Bubble */}
        {streamingResponse && (
          <div className="flex flex-col items-start w-full">
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-indigo-400">
              <Bot className="w-3 h-3" />
              <span className="font-mono">Streaming response...</span>
            </div>
            <div className="w-full bg-white/[0.04] border border-indigo-500/30 rounded-2xl rounded-tl-sm p-3.5 text-xs text-gray-200 shadow-lg">
              <MarkdownRenderer content={streamingResponse} isGenerating={true} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt & Skills Chips (when conversation has messages) */}
      {messages.length > 0 && (
        <div className="px-4 py-1.5 border-t border-white/5 bg-black/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {AGENTIC_SKILL_CHIPS.map((skill, idx) => {
            const Icon = skill.icon;
            return (
              <button
                key={`skill-${idx}`}
                onClick={() => handleSendMessage(skill.prompt)}
                disabled={isGenerating}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyberLime/10 hover:bg-cyberLime/20 border border-cyberLime/30 text-[10px] text-cyberLime font-medium transition-colors disabled:opacity-50"
                title={skill.prompt}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{skill.label}</span>
              </button>
            );
          })}
          {QUICK_PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={`prompt-${idx}`}
              onClick={() => handleSendMessage(chip.prompt)}
              disabled={isGenerating}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer */}
      <div className="p-3 border-t border-white/10 bg-gray-950/70">
        <div className="relative bg-gray-900 border border-white/15 focus-within:border-indigo-500/60 rounded-xl transition-all">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot (Shift+Enter for newline)..."
            rows={2}
            className="w-full bg-transparent p-2.5 text-xs text-white placeholder-gray-500 resize-none focus:outline-none scrollbar-none"
          />

          <div className="flex items-center justify-between px-2.5 pb-2 text-[10px] text-gray-500">
            <span>Press Enter to send</span>

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-colors"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
