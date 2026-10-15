import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Server,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useStore } from '../context/ContextStore';
import { GlassInput, PrimaryButton, GhostButton } from './ui/GlassComponents';
import { useToast } from '../context/ToastContext';
import { OpenAIProfile } from '../types';
import { fetchModelsFromEndpoint, DiscoveredModel } from '../lib/ai/openAICompatibleProvider';
import { listAvailableGeminiModels, GeminiDiscoveredModel } from '../lib/ai/geminiProvider';

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const {
    config,
    updateConfig,
    updateProfile,
    addProfile,
    deleteProfile,
    hasSystemEnvKey,
    resolveProfileKey,
  } = useStore();
  const { addToast } = useToast();

  const [selectedProfileId, setSelectedProfileId] = useState<string>(config.activeProfileId);
  const [profileForm, setProfileForm] = useState<OpenAIProfile | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Gemini state
  const [geminiApiKey, setGeminiApiKey] = useState(config.geminiApiKey);
  const [geminiModel, setGeminiModel] = useState(config.geminiModel);
  const [geminiDiscoveredModels, setGeminiDiscoveredModels] = useState<GeminiDiscoveredModel[]>([]);
  const [loadingGeminiModels, setLoadingGeminiModels] = useState(false);

  // New profile creator
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('http://localhost:11434/v1');

  useEffect(() => {
    setSelectedProfileId(config.activeProfileId);
    setGeminiApiKey(config.geminiApiKey);
    setGeminiModel(config.geminiModel);
  }, [config.activeProfileId, config.geminiApiKey, config.geminiModel]);

  useEffect(() => {
    const current = config.profiles.find((p) => p.id === selectedProfileId) || config.profiles[0];
    if (current) {
      setProfileForm({ ...current });
      setDiscoveredModels([]);
    }
  }, [selectedProfileId, config.profiles]);

  if (!isOpen || !profileForm) return null;

  const handleFetchModels = async () => {
    setLoadingModels(true);
    try {
      const resolvedKey = resolveProfileKey(profileForm);
      const models = await fetchModelsFromEndpoint(profileForm.baseUrl, resolvedKey);
      setDiscoveredModels(models);
      if (models.length > 0) {
        addToast(`Discovered ${models.length} models from endpoint`, 'success');
      } else {
        addToast('No models returned. You can still specify model name manually.', 'info');
      }
    } catch {
      addToast('Could not query /models from endpoint', 'error');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleFetchGeminiModels = async () => {
    setLoadingGeminiModels(true);
    try {
      const models = await listAvailableGeminiModels(geminiApiKey);
      setGeminiDiscoveredModels(models);
      if (models.length > 0) {
        addToast(`Found ${models.length} available Gemini models`, 'success');
      } else {
        addToast('No models returned. Please verify GEMINI_API_KEY.', 'error');
      }
    } catch {
      addToast('Failed to list Gemini models', 'error');
    } finally {
      setLoadingGeminiModels(false);
    }
  };

  const handleSaveCurrentProfile = () => {
    if (profileForm) {
      updateProfile(profileForm.id, profileForm);
      updateConfig({
        activeProfileId: profileForm.id,
        geminiApiKey,
        geminiModel,
      });
      addToast('Provider settings saved', 'success');
      onClose();
    }
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim() || !newProfileUrl.trim()) {
      addToast('Please provide a profile name and base URL', 'error');
      return;
    }

    if (profileForm) {
      updateProfile(profileForm.id, profileForm);
    }

    const id = 'custom-' + Date.now().toString(36);
    const newProf: OpenAIProfile = {
      id,
      name: newProfileName.trim(),
      baseUrl: newProfileUrl.trim(),
      apiKey: '',
      model: 'default',
      isPreset: false,
    };

    addProfile(newProf);
    setSelectedProfileId(id);
    setIsCreatingNew(false);
    setNewProfileName('');
    setNewProfileUrl('');
    addToast(`Created profile "${newProf.name}"`, 'success');
  };

  const isCurrentPreset = profileForm.isPreset;
  const isEnvActive = hasSystemEnvKey(profileForm.envKeyName);
  const isGeminiEnvActive = hasSystemEnvKey('GEMINI_API_KEY');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-obsidian border border-white/10 rounded-xl shadow-2xl shadow-deepViolet/10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyberLime" />
            <h3 className="text-lg font-bold text-white tracking-tight">AI Provider & Profile Hub</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Profile Selector Toolbar */}
          <div className="space-y-3 pb-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyberLime" />
                Select Endpoint Profile
              </label>
              <button
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-xs flex items-center gap-1.5 text-cyberLime hover:text-white transition-colors px-2.5 py-1 rounded-md bg-white/5 border border-white/5 hover:border-cyberLime/30"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingNew ? 'Cancel New' : 'Add Custom Endpoint'}
              </button>
            </div>

            {/* Profile pills */}
            <div className="flex flex-wrap gap-2">
              {config.profiles.map((p) => {
                const isSelected = p.id === selectedProfileId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (profileForm && profileForm.id !== p.id) {
                        updateProfile(profileForm.id, profileForm);
                      }
                      setSelectedProfileId(p.id);
                      updateConfig({ activeProfileId: p.id });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-cyberLime/15 border-cyberLime/50 text-white shadow-[0_0_10px_rgba(132,249,6,0.15)] font-bold'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-cyberLime animate-pulse' : 'bg-gray-600'
                      }`}
                    />
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* New Profile Quick Creator */}
            {isCreatingNew && (
              <div className="p-4 rounded-xl bg-white/5 border border-cyberLime/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="text-xs font-mono font-bold text-cyberLime">Add New OpenAI-Compatible Service</div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput
                    placeholder="Profile Name (e.g. vLLM Cluster)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                  />
                  <GlassInput
                    placeholder="Base URL (e.g. http://192.168.1.100:8000/v1)"
                    value={newProfileUrl}
                    onChange={(e) => setNewProfileUrl(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <GhostButton onClick={() => setIsCreatingNew(false)}>Cancel</GhostButton>
                  <PrimaryButton onClick={handleCreateProfile}>Create Profile</PrimaryButton>
                </div>
              </div>
            )}
          </div>

          {/* Active Profile Configuration Form */}
          <div className="space-y-4 pb-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
                  {profileForm.name} Settings
                </h4>
                {isEnvActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyberLime/10 border border-cyberLime/30 text-cyberLime">
                    System Env Active ({profileForm.envKeyName})
                  </span>
                )}
              </div>

              {!isCurrentPreset && (
                <button
                  onClick={() => {
                    deleteProfile(profileForm.id);
                    addToast(`Deleted profile "${profileForm.name}"`, 'info');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 p-1 hover:bg-white/5 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-mono">BASE URL (/v1)</label>
                <GlassInput
                  value={profileForm.baseUrl}
                  onChange={(e) => setProfileForm({ ...profileForm, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-mono">API KEY</label>
                <GlassInput
                  value={profileForm.apiKey}
                  onChange={(e) => setProfileForm({ ...profileForm, apiKey: e.target.value })}
                  placeholder={
                    isEnvActive
                      ? `Using System Env: ${profileForm.envKeyName}`
                      : 'sk-... or leave empty if not required'
                  }
                  type="password"
                />
              </div>
            </div>

            {/* Model Selector & Live Discovery */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 font-mono">TARGET MODEL</label>
                <button
                  onClick={handleFetchModels}
                  disabled={loadingModels}
                  className="text-[10px] font-mono text-cyberLime hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                  {loadingModels ? 'Discovering...' : 'Query /models'}
                </button>
              </div>

              <div className="relative">
                <GlassInput
                  value={profileForm.model}
                  onChange={(e) => setProfileForm({ ...profileForm, model: e.target.value })}
                  placeholder="deepseek-chat, gpt-4o, llama3..."
                />

                {discoveredModels.length > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <select
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      value={profileForm.model}
                      onChange={(e) => setProfileForm({ ...profileForm, model: e.target.value })}
                    >
                      <option value="" disabled>Select discovered model...</option>
                      {discoveredModels.map((m) => (
                        <option key={m.id} value={m.id} className="bg-obsidian text-gray-200">
                          {m.name || m.id}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Native Gemini Direct Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-deepViolet" />
                <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
                  Native Gemini Direct SDK
                </h4>
              </div>
              {isGeminiEnvActive && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-deepViolet/10 border border-deepViolet/30 text-deepViolet">
                  System Env Active (GEMINI_API_KEY)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-mono">GEMINI API KEY</label>
                <GlassInput
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={isGeminiEnvActive ? 'Using System Env: GEMINI_API_KEY' : 'AIzaSy...'}
                  type="password"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500 font-mono">TARGET GEMINI MODEL</label>
                  <button
                    onClick={handleFetchGeminiModels}
                    disabled={loadingGeminiModels || !geminiApiKey}
                    className="text-[10px] font-mono text-deepViolet hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingGeminiModels ? 'animate-spin' : ''}`} />
                    {loadingGeminiModels ? 'Listing...' : 'List Models'}
                  </button>
                </div>

                <div className="relative">
                  <GlassInput
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    placeholder="gemini-2.5-flash, gemini-2.5-pro..."
                  />

                  {/* Dropdown with live or preset modern models */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <select
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                    >
                      <option value="" disabled>Select model...</option>
                      {geminiDiscoveredModels.length > 0 ? (
                        geminiDiscoveredModels.map((m) => (
                          <option key={m.id} value={m.id} className="bg-obsidian text-gray-200">
                            {m.displayName} ({m.id})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gemini-2.5-flash" className="bg-obsidian">Gemini 2.5 Flash (Recommended)</option>
                          <option value="gemini-2.5-pro" className="bg-obsidian">Gemini 2.5 Pro (Deep Reasoning)</option>
                          <option value="gemini-flash-latest" className="bg-obsidian">Gemini Flash Latest</option>
                          <option value="gemini-pro-latest" className="bg-obsidian">Gemini Pro Latest</option>
                          <option value="gemini-3.8-flash" className="bg-obsidian">Gemini 3.8 Flash</option>
                          <option value="gemini-3.5-flash" className="bg-obsidian">Gemini 3.5 Flash</option>
                          <option value="gemini-3.1-pro-preview" className="bg-obsidian">Gemini 3.1 Pro Preview</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={handleSaveCurrentProfile}>
            <Save className="w-4 h-4" /> Save Configuration
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};
