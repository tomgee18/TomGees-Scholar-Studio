import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
  DocumentContext,
  AppConfig,
  AIProvider,
  DEFAULT_SYSTEM_PROMPT,
  DraftHistoryItem,
  OpenAIProfile,
  DEFAULT_OPENAI_PROFILES,
} from '../types';
import { parseFile } from '../lib/parsers/index';
import { chunkDocumentText, retrieveTopKChunks } from '../lib/ai/retrievalEngine';
import { db } from '../lib/db';
import { invoke, isTauri } from '@tauri-apps/api/core';

interface ContextStoreType {
  documents: DocumentContext[];
  draftHistory: DraftHistoryItem[];
  addDocument: (file: File) => Promise<void>;
  addRawDocument: (name: string, content: string, type?: 'md' | 'txt') => Promise<DocumentContext>;
  removeDocument: (id: string) => Promise<void>;
  toggleDocumentEnabled: (id: string) => Promise<void>;
  clearDocuments: () => Promise<void>;
  saveDraftToHistory: (draft: Omit<DraftHistoryItem, 'id' | 'timestamp'>) => Promise<void>;
  deleteDraftFromHistory: (id: string) => Promise<void>;
  clearDraftHistory: () => Promise<void>;
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  activeProfile: OpenAIProfile | undefined;
  updateProfile: (profileId: string, updates: Partial<OpenAIProfile>) => void;
  addProfile: (profile: OpenAIProfile) => void;
  deleteProfile: (profileId: string) => void;
  resolveProfileKey: (profile: OpenAIProfile) => string;
  hasSystemEnvKey: (envKeyName?: string) => boolean;
  getFullContextString: () => string;
  getRetrievedContextString: (query: string, topK?: number) => Promise<string>;
  isStorageReady: boolean;
}

const StoreContext = createContext<ContextStoreType | undefined>(undefined);

const LOCAL_STORAGE_CONFIG_KEY = 'tomgees_config_v3';

const getSystemEnvMap = (): Record<string, string> => {
  try {
    if (typeof (window as any).__SYSTEM_ENV__ !== 'undefined') {
      return (window as any).__SYSTEM_ENV__;
    }
  } catch {
    // ignore
  }
  return {};
};

const saveConfigToDualStorage = (configToSave: AppConfig) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(configToSave));
  } catch (e) {
    console.warn('Failed to persist configuration to localStorage', e);
  }
  db.settings.put({ key: 'app_config', value: configToSave }).catch((err) => {
    console.warn('Failed to persist configuration to db.settings:', err);
  });
};

export const ContextStoreProvider = ({ children }: { children?: ReactNode }) => {
  const [documents, setDocuments] = useState<DocumentContext[]>([]);
  const [draftHistory, setDraftHistory] = useState<DraftHistoryItem[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const isConfigLoadedRef = useRef(false);

  const [config, setConfig] = useState<AppConfig>(() => {
    const envMap = getSystemEnvMap();

    // Synchronously check localStorage to prevent flash of default configuration
    let savedParsed: Partial<AppConfig> | null = null;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (saved) {
        savedParsed = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to read config from localStorage on init', e);
    }

    const defaultMerged = DEFAULT_OPENAI_PROFILES.map((defaultP) => {
      const savedP = (savedParsed?.profiles || []).find((p: OpenAIProfile) => p.id === defaultP.id);
      const envKey = defaultP.envKeyName ? envMap[defaultP.envKeyName] || '' : '';
      return {
        ...defaultP,
        ...(savedP || {}),
        apiKey: savedP?.apiKey || envKey,
      };
    });

    const customProfiles = (savedParsed?.profiles || []).filter(
      (p: OpenAIProfile) => !DEFAULT_OPENAI_PROFILES.some((d) => d.id === p.id)
    );

    return {
      aiProvider: savedParsed?.aiProvider || AIProvider.OPENAI_COMPATIBLE,
      activeProfileId: savedParsed?.activeProfileId || 'deepseek',
      profiles: [...defaultMerged, ...customProfiles],
      geminiApiKey: savedParsed?.geminiApiKey || envMap.GEMINI_API_KEY || (import.meta.env.VITE_GEMINI_API_KEY as string) || '',
      geminiModel: savedParsed?.geminiModel || 'gemini-2.0-flash',
      customSystemPrompt: savedParsed?.customSystemPrompt || DEFAULT_SYSTEM_PROMPT,
      webAccessEnabled: typeof savedParsed?.webAccessEnabled === 'boolean' ? savedParsed.webAccessEnabled : false,
      forceSmartRetrieval: typeof savedParsed?.forceSmartRetrieval === 'boolean' ? savedParsed.forceSmartRetrieval : false,
    };
  });

  useEffect(() => {
    const initializeStore = async () => {
      try {
        let envMap = getSystemEnvMap();

        if (isTauri()) {
          try {
            const tauriEnv = await invoke<Record<string, string>>('get_system_env_vars');
            if (tauriEnv && Object.keys(tauriEnv).length > 0) {
              envMap = { ...envMap, ...tauriEnv };
              (window as any).__SYSTEM_ENV__ = envMap;
            }
          } catch (tErr) {
            console.warn('Tauri host environment check skipped:', tErr);
          }
        }

        // 1. Dual-source hydration: Dexie IndexedDB (primary disk storage) + localStorage (fallback)
        let configSource: Partial<AppConfig> | null = null;
        try {
          const dexieSetting = await db.settings.get('app_config');
          if (dexieSetting?.value) {
            configSource = dexieSetting.value;
          } else {
            const savedConfig = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
            if (savedConfig) {
              configSource = JSON.parse(savedConfig);
            }
          }
        } catch (err) {
          console.warn('Failed to read config from db.settings / localStorage:', err);
        }

        if (configSource) {
          const mergedProfiles = DEFAULT_OPENAI_PROFILES.map((defaultP) => {
            const savedP = (configSource?.profiles || []).find((p: OpenAIProfile) => p.id === defaultP.id);
            const envKey = defaultP.envKeyName ? envMap[defaultP.envKeyName] || '' : '';
            return {
              ...defaultP,
              ...(savedP || {}),
              apiKey: savedP?.apiKey || envKey,
            };
          });

          const customProfiles = (configSource.profiles || []).filter(
            (p: OpenAIProfile) => !DEFAULT_OPENAI_PROFILES.some((d) => d.id === p.id)
          );

          setConfig((prev) => {
            const hydrated: AppConfig = {
              ...prev,
              ...configSource,
              profiles: [...mergedProfiles, ...customProfiles],
              geminiApiKey: configSource?.geminiApiKey || envMap.GEMINI_API_KEY || prev.geminiApiKey,
            };
            saveConfigToDualStorage(hydrated);
            return hydrated;
          });
        }

        isConfigLoadedRef.current = true;

        const loadedDocs = await db.documents.orderBy('timestamp').reverse().toArray();
        setDocuments(
          loadedDocs.map((d) => ({
            ...d,
            enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
          }))
        );

        // Auto-chunk any existing documents that were not previously chunked in DB
        for (const doc of loadedDocs) {
          const count = await db.chunks.where('documentId').equals(doc.id).count();
          if (count === 0 && doc.content) {
            const chunks = chunkDocumentText(doc.id, doc.name, doc.content);
            if (chunks.length > 0) {
              await db.chunks.bulkPut(chunks);
            }
          }
        }

        const loadedDrafts = await db.drafts.orderBy('timestamp').reverse().toArray();
        setDraftHistory(loadedDrafts);

        setIsStorageReady(true);
      } catch (err) {
        console.error('Failed to initialize local database storage', err);
        isConfigLoadedRef.current = true;
        setIsStorageReady(true);
      }
    };

    initializeStore();
  }, []);

  useEffect(() => {
    if (!isConfigLoadedRef.current) return;
    saveConfigToDualStorage(config);
  }, [config]);

  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...newConfig };
      if (isConfigLoadedRef.current) {
        saveConfigToDualStorage(next);
      }
      return next;
    });
  }, []);

  const activeProfile = config.profiles.find((p) => p.id === config.activeProfileId) || config.profiles[0];

  const updateProfile = useCallback((profileId: string, updates: Partial<OpenAIProfile>) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        profiles: prev.profiles.map((p) => (p.id === profileId ? { ...p, ...updates } : p)),
      };
      if (isConfigLoadedRef.current) {
        saveConfigToDualStorage(next);
      }
      return next;
    });
  }, []);

  const addProfile = useCallback((profile: OpenAIProfile) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        profiles: [...prev.profiles, profile],
        activeProfileId: profile.id,
      };
      if (isConfigLoadedRef.current) {
        saveConfigToDualStorage(next);
      }
      return next;
    });
  }, []);

  const deleteProfile = useCallback((profileId: string) => {
    setConfig((prev) => {
      const filtered = prev.profiles.filter((p) => p.id !== profileId);
      const next = {
        ...prev,
        profiles: filtered,
        activeProfileId: prev.activeProfileId === profileId ? filtered[0]?.id || '' : prev.activeProfileId,
      };
      if (isConfigLoadedRef.current) {
        saveConfigToDualStorage(next);
      }
      return next;
    });
  }, []);

  const hasSystemEnvKey = useCallback((envKeyName?: string): boolean => {
    if (!envKeyName) return false;
    const envMap = getSystemEnvMap();
    return Boolean(envMap[envKeyName]);
  }, []);

  const resolveProfileKey = useCallback((profile: OpenAIProfile): string => {
    if (profile.apiKey && profile.apiKey !== 'not-needed') {
      return profile.apiKey;
    }
    if (profile.envKeyName) {
      const envMap = getSystemEnvMap();
      if (envMap[profile.envKeyName]) {
        return envMap[profile.envKeyName];
      }
    }
    return '';
  }, []);

  const getFullContextString = useCallback(() => {
    const activeDocs = documents.filter((doc) => doc.enabled !== false);
    if (activeDocs.length === 0) return '';
    return activeDocs
      .map((doc) => `--- SOURCE: ${doc.name} (${doc.type}) ---\n${doc.content}\n`)
      .join('\n');
  }, [documents]);

  const getRetrievedContextString = useCallback(
    async (query: string, topK = 15): Promise<string> => {
      const activeDocs = documents.filter((doc) => doc.enabled !== false);
      if (activeDocs.length === 0) return '';

      const activeDocIds = new Set(activeDocs.map((d) => d.id));
      const allChunks = await db.chunks.toArray();
      const filteredChunks = allChunks.filter((c) => activeDocIds.has(c.documentId));

      if (filteredChunks.length === 0) {
        return getFullContextString();
      }

      const relevantChunks = retrieveTopKChunks(query, filteredChunks, topK);

      return (
        `[SMART RETRIEVAL APPLIED: Displaying ${relevantChunks.length} most relevant sections based on query]\n\n` +
        relevantChunks
          .map(
            (chunk) =>
              `--- EXCERPT FROM: ${chunk.docName} (Section #${chunk.chunkIndex + 1}) ---\n${chunk.content}\n`
          )
          .join('\n')
      );
    },
    [documents, getFullContextString]
  );

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const addDocument = useCallback(async (file: File) => {
    const text = await parseFile(file);
    if (!text || text.trim().length === 0) {
      throw new Error('File content is empty or could not be parsed.');
    }

    const docId = generateId();
    const newDoc: DocumentContext = {
      id: docId,
      name: file.name,
      type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.md') ? 'md' : 'txt',
      content: text,
      timestamp: Date.now(),
      sizeBytes: file.size || text.length,
      enabled: true,
    };

    // Index full document
    await db.documents.put(newDoc);

    // Slice and index semantic chunks for BM25 retrieval
    const chunks = chunkDocumentText(docId, file.name, text);
    if (chunks.length > 0) {
      await db.chunks.bulkPut(chunks);
    }

    setDocuments((prev) => [newDoc, ...prev]);
  }, []);

  const addRawDocument = useCallback(
    async (name: string, content: string, type: 'md' | 'txt' = 'md'): Promise<DocumentContext> => {
      if (!content || content.trim().length === 0) {
        throw new Error('Document content cannot be empty.');
      }

      const docId = generateId();
      const newDoc: DocumentContext = {
        id: docId,
        name,
        type,
        content,
        timestamp: Date.now(),
        sizeBytes: new Blob([content]).size,
        enabled: true,
      };

      await db.documents.put(newDoc);
      const chunks = chunkDocumentText(docId, name, content);
      if (chunks.length > 0) {
        await db.chunks.bulkPut(chunks);
      }

      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    },
    []
  );

  const toggleDocumentEnabled = useCallback(async (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          const nextState = !doc.enabled;
          db.documents.update(id, { enabled: nextState }).catch(console.error);
          return { ...doc, enabled: nextState };
        }
        return doc;
      })
    );
  }, []);

  const removeDocument = useCallback(async (id: string) => {
    await db.documents.delete(id);
    await db.chunks.where('documentId').equals(id).delete();
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  const clearDocuments = useCallback(async () => {
    await db.documents.clear();
    await db.chunks.clear();
    setDocuments([]);
  }, []);

  const saveDraftToHistory = useCallback(
    async (draft: Omit<DraftHistoryItem, 'id' | 'timestamp'>) => {
      const newItem: DraftHistoryItem = {
        ...draft,
        id: generateId(),
        timestamp: Date.now(),
      };
      await db.drafts.put(newItem);
      setDraftHistory((prev) => [newItem, ...prev]);
    },
    []
  );

  const deleteDraftFromHistory = useCallback(async (id: string) => {
    await db.drafts.delete(id);
    setDraftHistory((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDraftHistory = useCallback(async () => {
    await db.drafts.clear();
    setDraftHistory([]);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        documents,
        draftHistory,
        addDocument,
        addRawDocument,
        removeDocument,
        toggleDocumentEnabled,
        clearDocuments,
        saveDraftToHistory,
        deleteDraftFromHistory,
        clearDraftHistory,
        config,
        updateConfig,
        activeProfile,
        updateProfile,
        addProfile,
        deleteProfile,
        resolveProfileKey,
        hasSystemEnvKey,
        getFullContextString,
        getRetrievedContextString,
        isStorageReady,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a ContextStoreProvider');
  }
  return context;
};
