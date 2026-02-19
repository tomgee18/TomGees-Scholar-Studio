
import React, { useRef, useState } from 'react';
import { Upload, FileText, X, Database, Cpu, Cloud, Terminal, Trash2, ChevronDown, RefreshCw } from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { GlassCard } from './ui/GlassComponents';
import { AIProvider } from '../types';
import { useToast } from '../context/ToastContext';

export const Sidebar = () => {
  const { documents, addDocument, removeDocument, clearDocuments, config, updateConfig, availableOllamaModels, refreshOllamaModels } = useStore();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const processFile = async (file: File) => {
    try {
        addToast(`Parsing ${file.name}...`, 'info');
        await addDocument(file);
        addToast(`Successfully added ${file.name} to Vault`, 'success');
    } catch (error: any) {
        addToast(error.message || "Failed to parse file", 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearDocs = () => {
      clearDocuments();
      addToast("Context Vault cleared", 'info');
  };

  const toggleProvider = () => {
    const next = config.aiProvider === AIProvider.OPENROUTER_CLOUD 
      ? AIProvider.OLLAMA_LOCAL 
      : AIProvider.OPENROUTER_CLOUD;
    updateConfig({ aiProvider: next });
    addToast(`Switched to ${next === AIProvider.OPENROUTER_CLOUD ? 'Cloud' : 'Local'} Engine`, 'info');
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOllamaModels();
      addToast("Model list updated", 'info');
    } catch (err) {
      addToast("Failed to connect to Ollama", 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isCloud = config.aiProvider === AIProvider.OPENROUTER_CLOUD;
  const isOllamaLive = !isCloud && availableOllamaModels.length > 0;

  return (
    <aside className="w-80 flex flex-col h-full border-r border-white/10 bg-black/40 backdrop-blur-xl relative z-20">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyberLime" />
            Context Vault
            </h2>
            <p className="text-xs text-gray-500 mt-1">
            {documents.length} Source{documents.length !== 1 && 's'} Loaded
            </p>
        </div>
        {documents.length > 0 && (
            <button 
                onClick={handleClearDocs}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                title="Clear All Context"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
      </div>

      {/* Engine Switcher */}
      <div className="px-6 py-4 space-y-3">
        <GlassCard className="p-1">
            <button 
                onClick={toggleProvider}
                className="group relative flex items-center gap-3 w-full px-3 py-3 text-xs font-mono transition-all overflow-hidden rounded-lg hover:bg-white/5"
            >
                <div className={`
                    p-2 rounded-md transition-colors duration-300
                    ${isCloud ? 'bg-deepViolet/20 text-deepViolet' : 'bg-cyberLime/20 text-cyberLime'}
                `}>
                    {isCloud ? <Cloud className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                </div>

                <div className="flex-1 text-left">
                    <div className="text-gray-200 font-bold tracking-wide">
                        {isCloud ? 'OPENROUTER' : 'OLLAMA LOCAL'}
                    </div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
                        {isCloud ? 'Multi-Model Cloud' : 'Low-Latency / Privacy'}
                    </div>
                </div>

                <div className={`
                    w-1.5 h-1.5 rounded-full mr-2
                    ${isCloud ? 'bg-deepViolet shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-cyberLime shadow-[0_0_8px_rgba(132,249,6,0.8)]'}
                `} />
            </button>
        </GlassCard>

        {/* Live Model Selection Dropdown (Only for Ollama) */}
        {!isCloud && (
            <div className="flex flex-col gap-1 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase flex items-center gap-2">
                        Active Model
                        {isOllamaLive && (
                             <span className="flex h-1.5 w-1.5 rounded-full bg-cyberLime shadow-[0_0_5px_#84f906]" title="Service Online"></span>
                        )}
                    </label>
                    <span className={`text-[9px] ${isOllamaLive ? 'text-cyberLime' : 'text-gray-600'}`}>
                        {availableOllamaModels.length > 0 ? `${availableOllamaModels.length} Found` : 'Connecting...'}
                    </span>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Cpu className={`w-3.5 h-3.5 ${isOllamaLive ? 'text-cyberLime' : 'text-gray-600'}`} />
                        </div>
                        <select 
                            value={config.ollamaModel}
                            onChange={(e) => updateConfig({ ollamaModel: e.target.value })}
                            disabled={availableOllamaModels.length === 0}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-[11px] font-mono text-gray-300 appearance-none outline-none focus:border-cyberLime/50 transition-all cursor-pointer hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {availableOllamaModels.length > 0 ? (
                                availableOllamaModels.map(model => (
                                    <option key={model.name} value={model.name} className="bg-obsidian text-gray-300">
                                        {model.name} ({model.details?.parameter_size || 'Unknown'})
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled className="bg-obsidian">No service detected</option>
                            )}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                    </div>
                    <button 
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-cyberLime"
                      title="Force Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        )}
        
        {isCloud && (
            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg">
                <p className="text-[10px] font-mono text-gray-500 truncate">
                    ID: {config.openRouterModel.split('/').pop()}
                </p>
            </div>
        )}
      </div>

      {/* Drop Zone / Upload */}
      <div className="px-6 pb-4">
        <div 
          onClick={() => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8
            flex flex-col items-center justify-center gap-3
            cursor-pointer transition-all duration-300 group
            ${isDragging 
                ? 'border-cyberLime bg-cyberLime/10 scale-105' 
                : 'border-white/10 hover:border-cyberLime/50 hover:bg-white/5'
            }
          `}
        >
          <div className="p-3 rounded-full bg-white/5 group-hover:bg-cyberLime/10 transition-colors">
            <Upload className={`w-6 h-6 transition-colors ${isDragging ? 'text-cyberLime' : 'text-gray-400 group-hover:text-cyberLime'}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-300">
                {isDragging ? 'Drop to Upload' : 'Upload Materials'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF or TXT supported</p>
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".txt,.md,.pdf" 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
        {documents.map((doc) => (
          <div 
            key={doc.id}
            className="group flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all"
          >
            <FileText className="w-5 h-5 text-gray-500 group-hover:text-cyberLime mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] text-gray-500 uppercase">{doc.type}</span>
                 <span className="text-[10px] text-gray-600">{Math.round(doc.content.length / 1000)}kb</span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeDocument(doc.id);
                addToast("Document removed", 'info');
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        ))}
        
        {documents.length === 0 && (
            <div className="text-center mt-10 opacity-30">
                <Database className="w-12 h-12 mx-auto mb-2" />
                <p className="text-xs">Vault is empty</p>
            </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
            <span className="flex items-center gap-2">
                <Cpu className="w-3 h-3" />
                {isCloud ? 'OPENROUTER: READY' : `${config.ollamaModel.toUpperCase() || 'OLLAMA'}: ${isOllamaLive ? 'READY' : 'OFFLINE'}`}
            </span>
            <span className={isCloud || isOllamaLive ? (isCloud ? 'text-deepViolet' : 'text-cyberLime') : 'text-red-500'}>
                {isCloud || isOllamaLive ? 'ONLINE' : 'OFFLINE'}
            </span>
        </div>
      </div>
    </aside>
  );
};
