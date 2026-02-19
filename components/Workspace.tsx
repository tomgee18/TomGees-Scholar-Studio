
import React, { useState, useEffect, useRef } from 'react';
import { Download, Settings, Sparkles, FileText, FileCode, FileType, StopCircle, BookOpen, Briefcase, PenTool, Eraser, Printer, Copy, Check, Globe } from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { runDraftEngine } from '../lib/ai/draftEngine';
import { PrimaryButton, GlassCard } from './ui/GlassComponents';
import { DraftingState, DraftMode, AIProvider } from '../types';
import { SettingsModal } from './SettingsModal';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { useToast } from '../context/ToastContext';

export const Workspace = () => {
  const { documents, getFullContextString, config, updateConfig } = useStore();
  const { addToast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [selectedMode, setSelectedMode] = useState<DraftMode>(DraftMode.THESIS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [state, setState] = useState<DraftingState>({
    isGenerating: false,
    output: "",
    error: null
  });
  
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (state.isGenerating && outputContainerRef.current) {
       const { scrollHeight, clientHeight, scrollTop } = outputContainerRef.current;
       // Only scroll if user is already near bottom
       if (scrollHeight - scrollTop - clientHeight < 150) {
           outputContainerRef.current.scrollTop = scrollHeight;
       }
    }
  }, [state.output, state.isGenerating]);

  const handleGenerate = async () => {
    if (state.isGenerating) {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (isMounted.current) setState(prev => ({ ...prev, isGenerating: false }));
        addToast("Generation aborted", 'info');
        return;
    }

    if (!prompt.trim()) {
        addToast("Please enter a directive or prompt", 'error');
        return;
    }

    // Pre-flight Validation
    if (config.aiProvider === AIProvider.OPENROUTER_CLOUD && !config.openRouterApiKey) {
        setState(prev => ({ ...prev, error: "OpenRouter API Key is missing. Please check Settings." }));
        addToast("OpenRouter API Key missing", 'error');
        setIsSettingsOpen(true);
        return;
    }

    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, isGenerating: true, error: null, output: "" }));
    
    try {
      const context = getFullContextString();
      
      await runDraftEngine({
        mode: selectedMode,
        userDirective: prompt,
        contextData: context,
        config: {
            provider: config.aiProvider,
            ollamaEndpoint: config.ollamaEndpoint,
            ollamaModel: config.ollamaModel,
            openRouterApiKey: config.openRouterApiKey,
            openRouterModel: config.openRouterModel,
            customSystemPrompt: config.customSystemPrompt,
            webAccessEnabled: config.webAccessEnabled
        },
        onChunk: (chunk) => {
          if (isMounted.current) {
            setState(prev => ({
                ...prev,
                output: prev.output + chunk
            }));
          }
        },
        signal: abortControllerRef.current.signal
      });
      
      if (isMounted.current) setState(prev => ({ ...prev, isGenerating: false }));
    } catch (err: any) {
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
         if (isMounted.current) setState(prev => ({ ...prev, isGenerating: false }));
         return;
      }
      
      if (isMounted.current) {
        const errorMsg = err.message || "An unexpected error occurred.";
        setState(prev => ({ 
            ...prev, 
            isGenerating: false, 
            error: errorMsg
        }));
        addToast(errorMsg, 'error');
      }
    }
  };

  const handleCopy = async () => {
    if (!state.output) return;
    try {
      await navigator.clipboard.writeText(state.output);
      setCopied(true);
      addToast("Draft copied to clipboard", 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
      addToast("Failed to copy", 'error');
    }
  };

  const convertMarkdownToHtml = (md: string) => {
    const lines = md.split('\n');
    let html = '';
    let inTable = false;
    let tableBuffer: string[] = [];
    let inCode = false;

    const parseInline = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:#f0f0f0; padding:2px 4px; border-radius:3px;">$1</code>');
    };

    const flushTable = () => {
       if(tableBuffer.length > 0) {
          const headerRow = tableBuffer[0];
          const bodyRows = tableBuffer.slice(2); 
          html += '<table style="width:100%; border-collapse:collapse; margin:20px 0; border:1px solid #000;">';
          html += '<thead><tr style="background-color:#f0f0f0;">';
          const headers = headerRow.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          headers.forEach(h => { html += `<th style="border:1px solid #000; padding:8px;">${parseInline(h)}</th>`; });
          html += '</tr></thead><tbody>';
          bodyRows.forEach(row => {
              html += '<tr>';
              const cells = row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
              cells.forEach(c => { html += `<td style="border:1px solid #000; padding:8px;">${parseInline(c)}</td>`; });
              html += '</tr>';
          });
          html += '</tbody></table>';
          tableBuffer = [];
       }
       inTable = false;
    };

    lines.forEach(line => {
      const trimmed = line.trim();
      if(trimmed.startsWith('```')) {
          if(inTable) flushTable();
          inCode = !inCode;
          html += inCode ? '<pre style="background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;"><code>' : '</code></pre>';
          return;
      }
      if(inCode) { html += line + '\n'; return; }
      if(trimmed.startsWith('|')) { inTable = true; tableBuffer.push(line); return; } else { if(inTable) flushTable(); }
      if(line.startsWith('# ')) { html += `<h1 style="font-size:24px; margin-top:24px; margin-bottom:12px; font-weight:bold;">${parseInline(line.substring(2))}</h1>`; return; }
      if(line.startsWith('## ')) { html += `<h2 style="font-size:20px; margin-top:20px; margin-bottom:10px; font-weight:bold; color:#333;">${parseInline(line.substring(3))}</h2>`; return; }
      if(line.startsWith('### ')) { html += `<h3 style="font-size:18px; margin-top:16px; margin-bottom:8px; font-weight:bold; color:#555;">${parseInline(line.substring(4))}</h3>`; return; }
      if(trimmed.startsWith('- ') || trimmed.startsWith('* ')) { html += `<li style="margin-left:20px; margin-bottom:4px;">${parseInline(trimmed.substring(2))}</li>`; return; }
      if(trimmed) { html += `<p style="margin-bottom:12px; line-height:1.6;">${parseInline(line)}</p>`; }
    });
    if(inTable) flushTable();
    return html;
  };

  const handleExport = (format: 'txt' | 'md' | 'html' | 'pdf') => {
    if (!state.output) {
        addToast("No content to export", 'error');
        return;
    }
    if (format === 'pdf') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const htmlContent = convertMarkdownToHtml(state.output);
            printWindow.document.write(`
                <html>
                <head>
                    <title>TomGees Draft - ${selectedMode}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; color: black; }
                        @media print { body { -webkit-print-color-adjust: exact; } @page { margin: 2cm; } }
                    </style>
                </head>
                <body>
                    <div style="margin-bottom: 40px; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
                        <h1 style="margin:0; font-family: Arial, sans-serif;">TomGees Scholar Studio</h1>
                        <p style="margin:5px 0 0 0; color: #666; font-family: Arial, sans-serif; font-size: 12px;">Draft Mode: ${selectedMode} | Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="content">${htmlContent}</div>
                    <script>window.onload = function() { window.print(); window.close(); }</script>
                </body>
                </html>
            `);
            printWindow.document.close();
            addToast("PDF Print Dialog Opened", 'success');
        } else {
            addToast("Pop-up blocked. Allow pop-ups to print.", 'error');
        }
        setShowExportMenu(false);
        return;
    }
    let content = state.output;
    let mimeType = 'text/plain';
    let extension = format;
    if (format === 'html') {
      mimeType = 'text/html';
      const htmlContent = convertMarkdownToHtml(state.output);
      content = `<!DOCTYPE html><html><head><title>TomGees Draft</title><style>body{font-family:'Times New Roman',serif;max-width:800px;margin:40px auto;line-height:1.6;color:#1a1a1a;padding:20px;}table{border-collapse:collapse;width:100%;margin:20px 0;border:1px solid #ddd;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f9f9f9;}</style></head><body><h1>Draft Mode: ${selectedMode}</h1><hr/>${htmlContent}</body></html>`;
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TomGees-${selectedMode}-${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported as .${extension}`, 'success');
    setShowExportMenu(false);
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-obsidian relative">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-deepViolet/10 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-cyberLime/5 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 z-10 bg-black/20 backdrop-blur-sm">
        <div>
           <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
             TomGees <span className="font-thin text-gray-500">|</span> Scholar Studio
           </h1>
           <p className="text-xs text-gray-400 font-mono mt-1">CONTEXT-AWARE DRAFTING ENGINE</p>
        </div>
        <div className="flex gap-3 items-center">
             {state.output && (
                <div className="flex items-center gap-2">
                 <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5" title="Copy to Clipboard">
                    {copied ? <Check className="w-4 h-4 text-cyberLime" /> : <Copy className="w-4 h-4" />}
                 </button>
                 <div className="relative">
                 <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5">
                    <Download className="w-4 h-4" /> Export
                 </button>
                 {showExportMenu && (
                   <div className="absolute top-full right-0 mt-2 w-56 bg-obsidian border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                     <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"><Printer className="w-4 h-4 text-red-400" /> Print to PDF</button>
                     <div className="h-[1px] bg-white/5 w-full"></div>
                     <button onClick={() => handleExport('md')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"><FileCode className="w-4 h-4 text-cyberLime" /> Markdown (.md)</button>
                     <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Plain Text (.txt)</button>
                     <button onClick={() => handleExport('html')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"><FileType className="w-4 h-4 text-deepViolet" /> Word Compatible (.html)</button>
                   </div>
                 )}
                 </div>
                </div>
             )}
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Settings className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden z-10 relative">
        {/* Left Pane: Controls */}
        <div className="w-1/3 min-w-[350px] p-6 flex flex-col gap-6 border-r border-white/5 overflow-y-auto">
            
            {/* Mode Selector */}
            <div className="space-y-2">
                <label className="text-xs font-mono text-gray-500 uppercase">Operational Mode</label>
                <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => setSelectedMode(DraftMode.THESIS)} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all ${selectedMode === DraftMode.THESIS ? 'bg-deepViolet/10 border-deepViolet/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>
                        <BookOpen className="w-4 h-4" />
                        <div className="text-left"><div className="font-medium">Thesis Mode</div><div className="text-[10px] opacity-60">Formal Academic Structure</div></div>
                    </button>
                    <button onClick={() => setSelectedMode(DraftMode.BUSINESS)} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all ${selectedMode === DraftMode.BUSINESS ? 'bg-deepViolet/10 border-deepViolet/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>
                        <Briefcase className="w-4 h-4" />
                        <div className="text-left"><div className="font-medium">Business Mode</div><div className="text-[10px] opacity-60">Corporate Strategy Plans</div></div>
                    </button>
                    <button onClick={() => setSelectedMode(DraftMode.CUSTOM)} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all ${selectedMode === DraftMode.CUSTOM ? 'bg-deepViolet/10 border-deepViolet/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}>
                        <PenTool className="w-4 h-4" />
                        <div className="text-left"><div className="font-medium">Custom Mode</div><div className="text-[10px] opacity-60">Freeform Drafting</div></div>
                    </button>
                </div>
            </div>

            {/* Features Toggles */}
            <div className="space-y-2">
                 <label className="text-xs font-mono text-gray-500 uppercase">Augmentation</label>
                 <button 
                    onClick={() => updateConfig({ webAccessEnabled: !config.webAccessEnabled })}
                    className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all
                        ${config.webAccessEnabled 
                            ? 'bg-cyberLime/10 border-cyberLime/50 text-white shadow-[0_0_10px_rgba(132,249,6,0.1)]' 
                            : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}
                    `}
                 >
                    <div className="flex items-center gap-3">
                        <Globe className={`w-4 h-4 ${config.webAccessEnabled ? 'text-cyberLime' : 'text-gray-500'}`} />
                        <div className="text-left">
                            <div className="font-medium">Web Access (OER)</div>
                            <div className="text-[10px] opacity-60">Open Educational Resources</div>
                        </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full border ${config.webAccessEnabled ? 'bg-cyberLime border-cyberLime' : 'bg-transparent border-gray-600'}`} />
                 </button>
            </div>

            {/* Prompt Input */}
            <div className="flex-1 flex flex-col space-y-2 min-h-[200px]">
                <label className="text-xs font-mono text-gray-500 uppercase">
                    {selectedMode === DraftMode.THESIS && "Research Topic / Objective"}
                    {selectedMode === DraftMode.BUSINESS && "Business Idea / Company Name"}
                    {selectedMode === DraftMode.CUSTOM && "Direct Instructions"}
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                        selectedMode === DraftMode.THESIS ? "E.g., The impact of AI on modern education systems..." :
                        selectedMode === DraftMode.BUSINESS ? "E.g., A SaaS platform for urban farming logistics..." :
                        "Describe exactly what you want drafted..."
                    }
                    className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:border-deepViolet/50 focus:bg-black/60 outline-none resize-none font-sans leading-relaxed transition-all duration-300"
                />
            </div>

            {/* Action Bar */}
            <div className="pt-2">
                <PrimaryButton onClick={handleGenerate} className={`w-full justify-center h-12 transition-all duration-300 ${state.isGenerating ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:shadow-none' : 'bg-cyberLime text-black'}`}>
                    {state.isGenerating ? (<><StopCircle className="w-4 h-4 animate-pulse" />Stop Generation</>) : (<><Sparkles className="w-4 h-4" />Initialize {selectedMode} Draft</>)}
                </PrimaryButton>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-gray-600">ENGINE: {config.aiProvider === 'OPENROUTER_CLOUD' ? 'CLOUD' : 'LOCAL'}</span>
                    {documents.length > 0 && <div className="flex items-center gap-2 text-cyberLime/70"><div className="w-1.5 h-1.5 rounded-full bg-cyberLime animate-pulse" />CONTEXT LINKED</div>}
                </div>
            </div>
        </div>

        {/* Right Pane: Output */}
        <div ref={outputContainerRef} className="flex-1 bg-black/40 p-8 overflow-y-auto scroll-smooth">
            {state.output || state.isGenerating ? (
                <div className="max-w-4xl mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4">
                    <div className="flex justify-end mb-2">
                         <button onClick={() => setState(prev => ({ ...prev, output: "" }))} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"><Eraser className="w-3 h-3" /> Clear Output</button>
                    </div>
                    <GlassCard className={`p-10 min-h-[700px] bg-black/60 transition-all duration-500 ${state.isGenerating ? 'shadow-glow-violet border-deepViolet/30' : ''}`}>
                         <MarkdownRenderer content={state.output} isGenerating={state.isGenerating} />
                    </GlassCard>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4"><PenTool className="w-8 h-8 opacity-20" /></div>
                    <p className="font-mono text-sm uppercase tracking-widest">Workspace Idle</p>
                    <p className="text-xs opacity-50 max-w-xs text-center">Selected Mode: <span className="text-cyberLime">{selectedMode}</span><br/>Upload context to the vault and input your directives to begin.</p>
                    {state.error && <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md text-center">{state.error}</div>}
                </div>
            )}
            <div className="h-20" /> 
        </div>
      </div>
    </main>
  );
};
