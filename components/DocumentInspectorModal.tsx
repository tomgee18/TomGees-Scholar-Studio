import React, { useState, useEffect } from 'react';
import { X, FileText, Search, Copy, Check } from 'lucide-react';
import { DocumentContext } from '../types';
import { useToast } from '../context/ToastContext';
import { estimateTokens } from '../lib/ai/tokenManager';

interface DocumentInspectorModalProps {
  document: DocumentContext | null;
  onClose: () => void;
  initialSearchTerm?: string;
}

export const DocumentInspectorModal = ({
  document,
  onClose,
  initialSearchTerm = '',
}: DocumentInspectorModalProps) => {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSearchTerm(initialSearchTerm || '');
  }, [document?.id, initialSearchTerm]);

  if (!document) return null;

  const tokenCount = estimateTokens(document.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      addToast('Extracted text copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const filteredContent = searchTerm
    ? document.content
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
        .join('\n')
    : document.content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-obsidian border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyberLime/10 border border-cyberLime/20 text-cyberLime">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white truncate max-w-md">{document.name}</h3>
              <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 mt-0.5">
                <span className="uppercase">{document.type}</span>
                <span>•</span>
                <span>~{tokenCount.toLocaleString()} estimated tokens</span>
                <span>•</span>
                <span>{(document.content.length / 1000).toFixed(1)}k chars</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors border border-white/5"
              title="Copy all text"
            >
              {copied ? <Check className="w-4 h-4 text-cyberLime" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bar inside reader */}
        <div className="px-6 py-2.5 border-b border-white/5 bg-black/30 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search within extracted document..."
            className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-500 outline-none font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[10px] text-gray-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Content viewer */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap select-text selection:bg-cyberLime/20 bg-black/40">
          {filteredContent || <span className="text-gray-600 italic">No matching content found.</span>}
        </div>
      </div>
    </div>
  );
};
