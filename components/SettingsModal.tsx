
import React, { useState, useEffect } from 'react';
import { X, Save, Server, Cpu, Cloud, Terminal, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Copy } from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { GlassInput, PrimaryButton, GhostButton } from './ui/GlassComponents';
import { useToast } from '../context/ToastContext';

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { config, updateConfig, availableOllamaModels, refreshOllamaModels } = useStore();
  const { addToast } = useToast();
  
  // Local state for form fields
  const [endpoint, setEndpoint] = useState(config.ollamaEndpoint);
  const [ollamaModel, setOllamaModel] = useState(config.ollamaModel);
  const [apiKey, setApiKey] = useState(config.openRouterApiKey);
  const [openRouterModel, setOpenRouterModel] = useState(config.openRouterModel);
  
  // Cloud model list with rich metadata
  const [orModels, setOrModels] = useState<{
      id: string, 
      name: string, 
      context_length: number, 
      pricing: { prompt: string, completion: string },
      description?: string
  }[]>([]);
  
  const [loadingOr, setLoadingOr] = useState(false);
  const [loadingOllama, setLoadingOllama] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    setEndpoint(config.ollamaEndpoint);
    setOllamaModel(config.ollamaModel);
    setApiKey(config.openRouterApiKey);
    setOpenRouterModel(config.openRouterModel);
    setTestStatus('idle');
  }, [config]);

  useEffect(() => {
    if (isOpen && orModels.length === 0) {
        fetchOpenRouterModels();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateConfig({ 
        ollamaEndpoint: endpoint,
        ollamaModel: ollamaModel,
        openRouterApiKey: apiKey,
        openRouterModel: openRouterModel
    });
    addToast("Settings Configuration Saved", 'success');
    onClose();
  };

  const fetchOpenRouterModels = async () => {
      setLoadingOr(true);
      try {
          const res = await fetch("https://openrouter.ai/api/v1/models");
          const data = await res.json();
          if (data && data.data && Array.isArray(data.data)) {
              const sorted = data.data.sort((a: any, b: any) => a.name.localeCompare(b.name));
              setOrModels(sorted);
          }
      } catch (e) {
          console.error("OpenRouter Fetch Error", e);
      } finally {
          setLoadingOr(false);
      }
  };

  const handleRefreshOllama = async () => {
      setLoadingOllama(true);
      setTestStatus('idle');
      try {
          await refreshOllamaModels();
          setTestStatus('success');
          addToast("Local engine connected", 'success');
      } catch (e: any) {
          setTestStatus('error');
          addToast("Ollama connection failed", 'error');
      } finally {
          setLoadingOllama(false);
      }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast("Command copied to clipboard", 'success');
  };

  const formatContext = (ctx: number) => {
      if (!ctx) return '?';
      if (ctx >= 1000000) return `${Math.round(ctx / 1000000)}M`;
      if (ctx >= 1000) return `${Math.round(ctx / 1024)}k`;
      return ctx;
  };

  const getModelTags = (m: any) => {
      const tags = [];
      
      // Robust Free Check: Parse float to handle "0", "0.0", "0.0000" variations
      const promptPrice = parseFloat(m.pricing?.prompt || '1');
      const completionPrice = parseFloat(m.pricing?.completion || '1');
      const isFree = promptPrice === 0 && completionPrice === 0;

      const desc = (m.description || "").toLowerCase();
      const id = (m.id || "").toLowerCase();

      // Tool capability heuristic
      const hasTools = 
          desc.includes("tool use") || 
          desc.includes("function call") || 
          id.includes("gpt-4") || 
          id.includes("claude-3") || 
          id.includes("gemini") || 
          id.includes("mistral-large") ||
          (id.includes("llama-3") && desc.includes("groq"));

      // Web/Online capability heuristic
      const hasWeb = 
          id.includes("sonar") || 
          id.includes("online") || 
          id.includes("perplexity") ||
          (id.includes("gemini") && desc.includes("search"));

      if (isFree) tags.push("FREE");
      if (hasTools) tags.push("TOOLS");
      if (hasWeb) tags.push("WEB");

      return tags;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-obsidian border border-white/10 rounded-xl shadow-2xl shadow-deepViolet/10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-deepViolet" />
            System Configuration
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* OpenRouter Config */}
          <div className="space-y-4 pb-6 border-b border-white/5">
             <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-deepViolet" />
                    <label className="text-sm font-mono text-gray-300 uppercase">OpenRouter Cloud</label>
                </div>
                <button 
                    onClick={fetchOpenRouterModels}
                    disabled={loadingOr}
                    className="text-[10px] flex items-center gap-1 text-cyberLime hover:text-white transition-colors"
                >
                    <RefreshCw className={`w-3 h-3 ${loadingOr ? 'animate-spin' : ''}`} />
                    {loadingOr ? 'Loading List...' : 'Refresh List'}
                </button>
             </div>
             
             <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                   <label className="text-xs text-gray-500 font-mono">API KEY</label>
                   <GlassInput 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-..."
                      type="password"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-xs text-gray-500 font-mono">MODEL ID</label>
                   <div className="relative">
                       <GlassInput 
                          value={openRouterModel}
                          onChange={(e) => setOpenRouterModel(e.target.value)}
                          placeholder="google/gemini-2.0-flash-001"
                       />
                       {orModels.length > 0 && (
                           <div className="absolute right-2 top-1/2 -translate-y-1/2">
                               <select 
                                 className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                 onChange={(e) => setOpenRouterModel(e.target.value)}
                                 value={openRouterModel}
                               >
                                 <option value="" disabled>Select a model...</option>
                                 {orModels.map(m => {
                                     const tags = getModelTags(m);
                                     return (
                                     <option key={m.id} value={m.id}>
                                         {m.name} ({formatContext(m.context_length)}) {tags.length > 0 ? `[${tags.join(' ')}]` : ''}
                                     </option>
                                     );
                                 })}
                               </select>
                               <ChevronDown className="w-4 h-4 text-gray-500 pointer-events-none" />
                           </div>
                       )}
                   </div>
                   <p className="text-[10px] text-gray-500 mt-1 flex gap-2">
                       <span>Legend:</span>
                       <span className="text-cyberLime">[FREE] No cost</span>
                       <span className="text-deepViolet">[TOOLS] Function Calling</span>
                       <span className="text-blue-400">[WEB] Online</span>
                   </p>
                </div>
             </div>
          </div>

          {/* Ollama Config */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyberLime" />
                    <label className="text-sm font-mono text-gray-300 uppercase">Local Inference Engine</label>
                </div>
                 <button 
                    onClick={handleRefreshOllama}
                    disabled={loadingOllama}
                    className="text-[10px] flex items-center gap-1 text-cyberLime hover:text-white transition-colors"
                >
                    <RefreshCw className={`w-3 h-3 ${loadingOllama ? 'animate-spin' : ''}`} />
                    {loadingOllama ? 'Connecting...' : 'Connect & Load'}
                </button>
             </div>
             
             <div className="grid grid-cols-1 gap-3">
                 <div className="space-y-1">
                   <label className="text-xs text-gray-500 font-mono">ENDPOINT URL</label>
                   <GlassInput 
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder="http://localhost:11434"
                    />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs text-gray-500 font-mono flex items-center gap-2">
                       MODEL TAG
                       {testStatus === 'success' && <CheckCircle2 className="w-3 h-3 text-cyberLime"/>}
                       {testStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500"/>}
                   </label>
                   <div className="relative">
                       <GlassInput 
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          placeholder="llama3"
                       />
                       {availableOllamaModels.length > 0 && (
                           <div className="absolute right-2 top-1/2 -translate-y-1/2">
                               <select 
                                 className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                 onChange={(e) => setOllamaModel(e.target.value)}
                                 value={ollamaModel}
                               >
                                 <option value="" disabled>Select local model...</option>
                                 {availableOllamaModels.map(m => (
                                     <option key={m.name} value={m.name}>
                                        {m.name} ({m.details?.parameter_size || '?'})
                                     </option>
                                 ))}
                               </select>
                               <ChevronDown className="w-4 h-4 text-gray-500 pointer-events-none" />
                           </div>
                       )}
                   </div>
                 </div>
                 
                 <div className={`rounded-lg p-3 border transition-colors ${testStatus === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Terminal className={`w-3 h-3 ${testStatus === 'error' ? 'text-red-400' : 'text-cyberLime'}`} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">CORS Troubleshooting</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                        Run this command if connection fails:
                    </p>
                    
                    <div className="group relative bg-black/50 p-2 rounded border border-white/5 font-mono text-[10px] text-cyberLime overflow-x-auto">
                        <code>OLLAMA_ORIGINS="*" ollama serve</code>
                        <button 
                            onClick={() => copyToClipboard(`OLLAMA_ORIGINS="*" ollama serve`)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Copy className="w-3 h-3 text-white" />
                        </button>
                    </div>
                 </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={handleSave}>
            <Save className="w-4 h-4" />
            Save Configuration
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};
