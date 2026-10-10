import React from 'react';
import { History, X, Trash2, ArrowUpRight, BookOpen, GraduationCap, Library, PenTool } from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { DraftHistoryItem, DraftMode } from '../types';
import { useToast } from '../context/ToastContext';

interface DraftHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDraft: (draft: DraftHistoryItem) => void;
}

export const DraftHistoryDrawer = ({ isOpen, onClose, onSelectDraft }: DraftHistoryDrawerProps) => {
  const { draftHistory, deleteDraftFromHistory, clearDraftHistory } = useStore();
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDraftFromHistory(id);
    addToast('Draft removed from history', 'info');
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear your entire draft history?')) {
      await clearDraftHistory();
      addToast('Draft history cleared', 'info');
    }
  };

  const getModeIcon = (mode: DraftMode) => {
    switch (mode) {
      case DraftMode.THESIS:
        return <BookOpen className="w-4 h-4 text-deepViolet" />;
      case DraftMode.EXAM_MASTERY:
        return <GraduationCap className="w-4 h-4 text-cyberLime" />;
      case DraftMode.LIT_REVIEW:
        return <Library className="w-4 h-4 text-blue-400" />;
      case DraftMode.CUSTOM:
      default:
        return <PenTool className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-obsidian border-l border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyberLime" />
            <h2 className="text-lg font-bold text-white tracking-tight">Draft History</h2>
            <span className="text-xs font-mono text-gray-500 ml-1">({draftHistory.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {draftHistory.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                title="Clear all drafts"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {draftHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3">
              <History className="w-10 h-10 opacity-30" />
              <p className="text-sm font-mono">No drafts saved yet</p>
              <p className="text-xs text-gray-600 text-center max-w-xs">
                Your completed generation runs are automatically saved here so you never lose research work.
              </p>
            </div>
          ) : (
            draftHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectDraft(item);
                  onClose();
                }}
                className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyberLime/40 hover:bg-white/10 cursor-pointer transition-all space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getModeIcon(item.mode)}
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                      {item.mode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-200 font-medium line-clamp-2 leading-snug">
                  {item.prompt || 'Untitled directive'}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-white/5">
                  <span>{item.provider.replace('_', ' ')}</span>
                  <span>{item.wordCount} words</span>
                  <span className="flex items-center gap-1 text-cyberLime group-hover:translate-x-0.5 transition-transform">
                    Restore <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
