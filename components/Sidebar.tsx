import React, { useRef, useState } from 'react';
import {
  Upload,
  X,
  Database,
  Sparkles,
  Trash2,
  Layers,
  ChevronDown,
  Eye,
  CheckSquare,
  Square,
  FolderKanban,
  Plus,
  Download,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { GlassCard } from './ui/GlassComponents';
import { AIProvider, DocumentContext } from '../types';
import { useToast } from '../context/ToastContext';
import { DocumentInspectorModal } from './DocumentInspectorModal';

export const Sidebar = () => {
  const {
    documents,
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
    exportVaultSnapshot,
    importVaultSnapshot,
    addDocument,
    removeDocument,
    toggleDocumentEnabled,
    clearDocuments,
    reindexAllDocuments,
    config,
    updateConfig,
    activeProfile,
  } = useStore();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const snapshotInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState<DocumentContext | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const processFile = async (file: File) => {
    try {
      addToast(`Parsing ${file.name}...`, 'info');
      await addDocument(file);
      addToast(`Added ${file.name} to ${activeWorkspace.name}`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to parse file', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const created = await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreatingWorkspace(false);
      addToast(`Created workspace "${created.name}"`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to create workspace', 'error');
    }
  };

  const handleDeleteCurrentWorkspace = async () => {
    if (activeWorkspaceId === 'default') return;
    if (
      window.confirm(
        `Delete workspace "${activeWorkspace.name}" and all its documents and drafts?`
      )
    ) {
      try {
        await deleteWorkspace(activeWorkspaceId);
        addToast(`Deleted workspace "${activeWorkspace.name}"`, 'info');
      } catch (err: any) {
        addToast(err.message || 'Failed to delete workspace', 'error');
      }
    }
  };

  const handleExportSnapshot = async () => {
    try {
      const snapshot = await exportVaultSnapshot();
      const jsonString = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `tomgees-vault-snapshot-${dateStr}.scholar.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Vault Snapshot (.scholar.json) exported!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to export Vault Snapshot', 'error');
    }
  };

  const handleImportSnapshotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const stats = await importVaultSnapshot(parsed);
      addToast(
        `Restored ${stats.documentsCount} docs & ${stats.draftsCount} drafts across ${stats.workspacesCount} workspace(s)!`,
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Invalid Vault Snapshot file', 'error');
    } finally {
      if (snapshotInputRef.current) {
        snapshotInputRef.current.value = '';
      }
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

  const togglePrimaryEngine = () => {
    const next =
      config.aiProvider === AIProvider.OPENAI_COMPATIBLE
        ? AIProvider.GEMINI_DIRECT
        : AIProvider.OPENAI_COMPATIBLE;
    updateConfig({ aiProvider: next });
    addToast(
      `Switched to ${next === AIProvider.OPENAI_COMPATIBLE ? 'Universal OpenAI' : 'Gemini Direct'}`,
      'info'
    );
  };

  const handleReindexVault = async () => {
    if (documents.length === 0 || isReindexing) return;
    setIsReindexing(true);
    try {
      const total = await reindexAllDocuments();
      addToast(
        `Re-indexed all ${documents.length} documents into ${total} academic chunks!`,
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Failed to re-index Vault documents', 'error');
    } finally {
      setIsReindexing(false);
    }
  };

  const isGemini = config.aiProvider === AIProvider.GEMINI_DIRECT;
  const activeDocs = documents.filter((d) => d.enabled !== false);
  const activeCount = activeDocs.length;
  const totalActiveChunks = activeDocs.reduce((acc, d) => acc + (d.chunkCount || 1), 0);

  return (
    <aside className="w-80 flex flex-col h-full border-r border-white/10 bg-black/40 backdrop-blur-xl relative z-20">
      <DocumentInspectorModal
        document={inspectingDoc}
        onClose={() => setInspectingDoc(null)}
      />

      {/* Header */}
      <div className="p-5 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyberLime" />
              Context Vault
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {activeCount}/{documents.length} Source{documents.length !== 1 && 's'} • {totalActiveChunks} Chunks
            </p>
          </div>
          {documents.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleReindexVault}
                disabled={isReindexing}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-cyberLime transition-colors disabled:opacity-50"
                title="Re-index all workspace documents with Hierarchical Academic Chunker"
              >
                <RotateCcw className={`w-4 h-4 ${isReindexing ? 'animate-spin text-cyberLime' : ''}`} />
              </button>
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      `Clear all indexed documents from workspace "${activeWorkspace.name}"?`
                    )
                  ) {
                    await clearDocuments();
                    addToast('Workspace Context Vault cleared', 'info');
                  }
                }}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                title="Clear workspace documents"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Research Workspace Switcher */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 px-0.5">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <FolderKanban className="w-3 h-3 text-cyberLime" />
              Research Workspace
            </span>
            <div className="flex items-center gap-1">
              {activeWorkspaceId !== 'default' && (
                <button
                  onClick={handleDeleteCurrentWorkspace}
                  className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-white/5 transition-colors"
                  title="Delete current workspace"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setIsCreatingWorkspace((prev) => !prev)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-cyberLime/20 text-gray-300 hover:text-cyberLime transition-colors"
                title="Create new Research Workspace"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>
          </div>

          {isCreatingWorkspace ? (
            <form onSubmit={handleCreateWorkspace} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g., BIO-401 Thesis..."
                autoFocus
                className="flex-1 bg-black/60 border border-cyberLime/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyberLime font-mono"
              />
              <button
                type="submit"
                className="p-1.5 bg-cyberLime/20 border border-cyberLime/40 text-cyberLime rounded-lg hover:bg-cyberLime/30"
                title="Create"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingWorkspace(false);
                  setNewWorkspaceName('');
                }}
                className="p-1.5 bg-white/5 text-gray-400 rounded-lg hover:text-white"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="relative">
              <select
                aria-label="Research Workspace"
                value={activeWorkspaceId}
                onChange={(e) => {
                  switchWorkspace(e.target.value);
                  const target = workspaces.find((w) => w.id === e.target.value);
                  if (target) {
                    addToast(`Switched to workspace: ${target.name}`, 'info');
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-gray-200 appearance-none outline-none focus:border-cyberLime/50 cursor-pointer hover:bg-white/10 transition-colors"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-obsidian text-gray-200">
                    {ws.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Engine Switcher */}
      <div className="px-6 py-3 space-y-3">
        <GlassCard className="p-1">
          <button
            onClick={togglePrimaryEngine}
            className="group relative flex items-center gap-3 w-full px-3 py-2.5 text-xs font-mono transition-all overflow-hidden rounded-lg hover:bg-white/5"
            title="Toggle Engine"
          >
            <div
              className={`p-2 rounded-md transition-colors duration-300 ${
                isGemini ? 'bg-deepViolet/20 text-deepViolet' : 'bg-cyberLime/20 text-cyberLime'
              }`}
            >
              {isGemini ? <Sparkles className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </div>

            <div className="flex-1 text-left">
              <div className="text-gray-200 font-bold tracking-wide">
                {isGemini ? 'GEMINI DIRECT' : 'OPENAI COMPATIBLE'}
              </div>
              <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
                {isGemini ? 'Native Google SDK' : activeProfile?.name || 'Multi-Endpoint'}
              </div>
            </div>

            <div
              className={`w-1.5 h-1.5 rounded-full mr-2 ${
                isGemini
                  ? 'bg-deepViolet shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                  : 'bg-cyberLime shadow-[0_0_8px_rgba(132,249,6,0.8)]'
              }`}
            />
          </button>
        </GlassCard>

        {/* Profile Switcher Dropdown (when on OpenAI Compatible) */}
        {!isGemini && (
          <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 px-1">
              <span>ENDPOINT PROFILE</span>
              <span className="text-cyberLime truncate max-w-[120px]">{activeProfile?.model}</span>
            </div>
            <div className="relative">
              <select
                value={config.activeProfileId}
                onChange={(e) => updateConfig({ activeProfileId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-gray-200 appearance-none outline-none focus:border-cyberLime/50 cursor-pointer hover:bg-white/10 transition-colors"
              >
                {config.profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-obsidian text-gray-200">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {isGemini && (
          <div className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center text-[10px] font-mono text-gray-400">
            <span>MODEL</span>
            <span className="text-gray-200 font-bold">{config.geminiModel}</span>
          </div>
        )}
      </div>

      {/* Upload Dropzone */}
      <div className="px-6 pb-3">
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
          className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group ${
            isDragging
              ? 'border-cyberLime bg-cyberLime/10 scale-102'
              : 'border-white/10 hover:border-cyberLime/50 hover:bg-white/5'
          }`}
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-cyberLime/10 transition-colors">
            <Upload
              className={`w-4 h-4 transition-colors ${
                isDragging ? 'text-cyberLime' : 'text-gray-400 group-hover:text-cyberLime'
              }`}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-200">
              {isDragging ? 'Drop to Index' : 'Add Study Materials'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">PDF, DOCX, Markdown, or TXT</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Document List with Inspect & Toggle */}
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
        {documents.map((doc) => {
          const isEnabled = doc.enabled !== false;
          return (
            <div
              key={doc.id}
              className={`group flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                isEnabled
                  ? 'bg-white/5 border-white/5 hover:border-white/20'
                  : 'bg-white/2 border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              {/* Checkbox toggle */}
              <button
                onClick={() => toggleDocumentEnabled(doc.id)}
                className="mt-0.5 text-gray-500 hover:text-cyberLime transition-colors"
                title={
                  isEnabled
                    ? 'Included in prompt (click to exclude)'
                    : 'Excluded from prompt (click to include)'
                }
              >
                {isEnabled ? (
                  <CheckSquare className="w-4 h-4 text-cyberLime" />
                ) : (
                  <Square className="w-4 h-4 text-gray-600" />
                )}
              </button>

              <div
                onClick={() => setInspectingDoc(doc)}
                className="flex-1 min-w-0 cursor-pointer"
                title="Click to inspect content"
              >
                <p className="text-xs text-gray-200 truncate font-medium group-hover:text-cyberLime transition-colors">
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-gray-500 uppercase font-mono">{doc.type}</span>
                  <span className="text-[9px] text-gray-600 font-mono">
                    {Math.max(1, Math.round(doc.content.length / 1000))}k chars
                  </span>
                  <span className="text-[9px] text-cyberLime/80 bg-cyberLime/10 px-1.5 py-0.2 rounded font-mono">
                    {doc.chunkCount || Math.max(1, Math.ceil(doc.content.split(/\s+/).length / 350))} chunk
                    {(doc.chunkCount || 1) === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setInspectingDoc(doc)}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10"
                  title="Inspect Document"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await removeDocument(doc.id);
                    addToast('Document removed', 'info');
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-white/10"
                  title="Delete Document"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {documents.length === 0 && (
          <div className="text-center mt-8 opacity-30">
            <Database className="w-10 h-10 mx-auto mb-2" />
            <p className="text-xs">Workspace Vault is empty</p>
          </div>
        )}
      </div>

      {/* Footer Status & Snapshot Portability */}
      <div className="p-4 border-t border-white/10 bg-black/60 backdrop-blur-xl space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>ACTIVE VAULT DOCS</span>
          <span className="text-cyberLime font-bold">{activeCount} IN CONTEXT</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportSnapshot}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-gray-300 hover:text-cyberLime transition-colors"
            title="Export portable Vault Snapshot (.scholar.json)"
          >
            <Download className="w-3 h-3" />
            <span>Backup Vault</span>
          </button>
          <button
            onClick={() => snapshotInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-gray-300 hover:text-deepViolet transition-colors"
            title="Restore portable Vault Snapshot (.scholar.json)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Vault</span>
          </button>
          <input
            ref={snapshotInputRef}
            type="file"
            accept=".json,.scholar.json"
            className="hidden"
            onChange={handleImportSnapshotFile}
          />
        </div>
      </div>
    </aside>
  );
};
