import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import {
  DocumentContext,
  AppConfig,
  AIProvider,
  DEFAULT_SYSTEM_PROMPT,
  DraftHistoryItem,
  OpenAIProfile,
  DEFAULT_OPENAI_PROFILES,
  ResearchWorkspace,
  VaultSnapshot,
} from '../types';
import { parseFile } from '../lib/parsers/index';
import { chunkDocumentText, retrieveTopKChunks } from '../lib/ai/retrievalEngine';
import { db } from '../lib/db';
import { invoke, isTauri } from '@tauri-apps/api/core';

export const DEFAULT_WORKSPACE: ResearchWorkspace = {
  id: 'default',
  name: 'General Research',
  description: 'Primary Context Vault & Manuscript Workspace',
  createdAt: 0,
  updatedAt: 0,
};

interface ContextStoreType {
  documents: DocumentContext[];
  draftHistory: DraftHistoryItem[];
  workspaces: ResearchWorkspace[];
  activeWorkspaceId: string;
  activeWorkspace: ResearchWorkspace;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, description?: string) => Promise<ResearchWorkspace>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  exportVaultSnapshot: () => Promise<VaultSnapshot>;
  importVaultSnapshot: (
    snapshot: VaultSnapshot
  ) => Promise<{ documentsCount: number; draftsCount: number; workspacesCount: number }>;
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
const LOCAL_STORAGE_WORKSPACE_KEY = 'tomgees_active_workspace_v1';

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
  const [allDocuments, setAllDocuments] = useState<DocumentContext[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftHistoryItem[]>([]);
  const [workspaces, setWorkspaces] = useState<ResearchWorkspace[]>([DEFAULT_WORKSPACE]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_WORKSPACE_KEY) || 'default';
    } catch {
      return 'default';
    }
  });
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
        contextWindow: savedP?.contextWindow || defaultP.contextWindow || 8192,
      };
    });

    const customProfiles = (savedParsed?.profiles || [])
      .filter((p: OpenAIProfile) => !DEFAULT_OPENAI_PROFILES.some((d) => d.id === p.id))
      .map((p: OpenAIProfile) => ({
        ...p,
        contextWindow: p.contextWindow || 8192,
      }));

    return {
      aiProvider: savedParsed?.aiProvider || AIProvider.OPENAI_COMPATIBLE,
      activeProfileId: savedParsed?.activeProfileId || 'deepseek',
      profiles: [...defaultMerged, ...customProfiles],
      geminiApiKey:
        savedParsed?.geminiApiKey ||
        envMap.GEMINI_API_KEY ||
        (import.meta.env.VITE_GEMINI_API_KEY as string) ||
        '',
      geminiModel: savedParsed?.geminiModel || 'gemini-2.0-flash',
      customSystemPrompt: savedParsed?.customSystemPrompt || DEFAULT_SYSTEM_PROMPT,
      webAccessEnabled:
        typeof savedParsed?.webAccessEnabled === 'boolean' ? savedParsed.webAccessEnabled : false,
      forceSmartRetrieval:
        typeof savedParsed?.forceSmartRetrieval === 'boolean'
          ? savedParsed.forceSmartRetrieval
          : false,
      strictGrounding:
        typeof savedParsed?.strictGrounding === 'boolean' ? savedParsed.strictGrounding : true,
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
            const savedP = (configSource?.profiles || []).find(
              (p: OpenAIProfile) => p.id === defaultP.id
            );
            const envKey = defaultP.envKeyName ? envMap[defaultP.envKeyName] || '' : '';
            return {
              ...defaultP,
              ...(savedP || {}),
              apiKey: savedP?.apiKey || envKey,
              contextWindow: savedP?.contextWindow || defaultP.contextWindow || 8192,
            };
          });

          const customProfiles = (configSource.profiles || [])
            .filter((p: OpenAIProfile) => !DEFAULT_OPENAI_PROFILES.some((d) => d.id === p.id))
            .map((p: OpenAIProfile) => ({
              ...p,
              contextWindow: p.contextWindow || 8192,
            }));

          setConfig((prev) => {
            const hydrated: AppConfig = {
              ...prev,
              ...configSource,
              profiles: [...mergedProfiles, ...customProfiles],
              geminiApiKey:
                configSource?.geminiApiKey || envMap.GEMINI_API_KEY || prev.geminiApiKey,
              strictGrounding:
                typeof configSource?.strictGrounding === 'boolean'
                  ? configSource.strictGrounding
                  : (prev.strictGrounding ?? true),
            };
            saveConfigToDualStorage(hydrated);
            return hydrated;
          });
        }

        isConfigLoadedRef.current = true;

        // Hydrate workspaces
        const loadedWorkspaces = await db.workspaces.orderBy('createdAt').toArray();
        const hasDefault = loadedWorkspaces.some((w) => w.id === 'default');
        const hydratedWorkspaces = hasDefault
          ? loadedWorkspaces
          : [DEFAULT_WORKSPACE, ...loadedWorkspaces];
        if (!hasDefault) {
          await db.workspaces.put(DEFAULT_WORKSPACE).catch(() => {});
        }
        setWorkspaces(hydratedWorkspaces);

        const savedWsSetting = await db.settings.get('active_workspace_id').catch(() => undefined);
        const targetWsId =
          savedWsSetting?.value || localStorage.getItem(LOCAL_STORAGE_WORKSPACE_KEY) || 'default';
        if (hydratedWorkspaces.some((w) => w.id === targetWsId)) {
          setActiveWorkspaceId(targetWsId);
        } else {
          setActiveWorkspaceId('default');
        }

        const loadedDocs = await db.documents.orderBy('timestamp').reverse().toArray();
        setAllDocuments(
          loadedDocs.map((d) => ({
            ...d,
            enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
            workspaceId: d.workspaceId || 'default',
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
        setAllDrafts(
          loadedDrafts.map((d) => ({
            ...d,
            workspaceId: d.workspaceId || 'default',
          }))
        );

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

  const documents = useMemo(
    () => allDocuments.filter((d) => (d.workspaceId || 'default') === activeWorkspaceId),
    [allDocuments, activeWorkspaceId]
  );

  const draftHistory = useMemo(
    () => allDrafts.filter((d) => (d.workspaceId || 'default') === activeWorkspaceId),
    [allDrafts, activeWorkspaceId]
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || DEFAULT_WORKSPACE,
    [workspaces, activeWorkspaceId]
  );

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const switchWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    try {
      localStorage.setItem(LOCAL_STORAGE_WORKSPACE_KEY, workspaceId);
    } catch {
      // ignore
    }
    db.settings.put({ key: 'active_workspace_id', value: workspaceId }).catch(() => {});
  }, []);

  const createWorkspace = useCallback(
    async (name: string, description?: string): Promise<ResearchWorkspace> => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error('Workspace name cannot be empty.');
      }
      const now = Date.now();
      const newWs: ResearchWorkspace = {
        id: generateId(),
        name: trimmed,
        description: description?.trim(),
        createdAt: now,
        updatedAt: now,
      };
      await db.workspaces.put(newWs);
      setWorkspaces((prev) => [...prev, newWs]);
      switchWorkspace(newWs.id);
      return newWs;
    },
    [switchWorkspace]
  );

  const renameWorkspace = useCallback(async (workspaceId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = Date.now();
    await db.workspaces.update(workspaceId, { name: trimmed, updatedAt: now });
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === workspaceId ? { ...w, name: trimmed, updatedAt: now } : w))
    );
  }, []);

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === 'default') {
        throw new Error('Cannot delete the Default Research Workspace.');
      }
      const wsDocs = allDocuments.filter((d) => d.workspaceId === workspaceId);
      for (const doc of wsDocs) {
        await db.documents.delete(doc.id);
        await db.chunks.where('documentId').equals(doc.id).delete();
      }
      const wsDrafts = allDrafts.filter((d) => d.workspaceId === workspaceId);
      for (const draft of wsDrafts) {
        await db.drafts.delete(draft.id);
      }
      await db.chatMessages.where('workspaceId').equals(workspaceId).delete().catch(() => {});
      await db.workspaces.delete(workspaceId);

      setAllDocuments((prev) => prev.filter((d) => d.workspaceId !== workspaceId));
      setAllDrafts((prev) => prev.filter((d) => d.workspaceId !== workspaceId));
      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));

      if (activeWorkspaceId === workspaceId) {
        switchWorkspace('default');
      }
    },
    [allDocuments, allDrafts, activeWorkspaceId, switchWorkspace]
  );

  const exportVaultSnapshot = useCallback(async (): Promise<VaultSnapshot> => {
    const [dbWorkspaces, dbDocs, dbChunks, dbDrafts, dbChats] = await Promise.all([
      db.workspaces.toArray(),
      db.documents.toArray(),
      db.chunks.toArray(),
      db.drafts.toArray(),
      db.chatMessages.toArray(),
    ]);

    return {
      version: 6,
      exportedAt: Date.now(),
      activeWorkspaceId,
      workspaces: dbWorkspaces.length > 0 ? dbWorkspaces : [DEFAULT_WORKSPACE],
      documents: dbDocs,
      chunks: dbChunks,
      drafts: dbDrafts,
      chatMessages: dbChats,
    };
  }, [activeWorkspaceId]);

  const importVaultSnapshot = useCallback(
    async (
      snapshot: VaultSnapshot
    ): Promise<{ documentsCount: number; draftsCount: number; workspacesCount: number }> => {
      if (!snapshot || !Array.isArray(snapshot.documents)) {
        throw new Error('Invalid Vault Snapshot file format.');
      }

      const incomingWorkspaces =
        Array.isArray(snapshot.workspaces) && snapshot.workspaces.length > 0
          ? snapshot.workspaces
          : [DEFAULT_WORKSPACE];
      const hasDefault = incomingWorkspaces.some((w) => w.id === 'default');
      const normalizedWorkspaces = hasDefault
        ? incomingWorkspaces
        : [DEFAULT_WORKSPACE, ...incomingWorkspaces];

      const normalizedDocs = snapshot.documents.map((d) => ({
        ...d,
        enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
        workspaceId: d.workspaceId || 'default',
      }));

      const normalizedDrafts = (snapshot.drafts || []).map((d) => ({
        ...d,
        workspaceId: d.workspaceId || 'default',
      }));

      const incomingChunks = Array.isArray(snapshot.chunks) ? snapshot.chunks : [];
      const incomingChats = Array.isArray(snapshot.chatMessages) ? snapshot.chatMessages : [];

      await db.workspaces.bulkPut(normalizedWorkspaces);
      await db.documents.bulkPut(normalizedDocs);

      if (incomingChunks.length > 0) {
        await db.chunks.bulkPut(incomingChunks);
      } else {
        for (const doc of normalizedDocs) {
          const chunks = chunkDocumentText(doc.id, doc.name, doc.content);
          if (chunks.length > 0) {
            await db.chunks.bulkPut(chunks);
          }
        }
      }

      if (normalizedDrafts.length > 0) {
        await db.drafts.bulkPut(normalizedDrafts);
      }
      if (incomingChats.length > 0) {
        await db.chatMessages.bulkPut(incomingChats);
      }

      const refreshedWorkspaces = await db.workspaces.orderBy('createdAt').toArray();
      const refreshedDocs = await db.documents.orderBy('timestamp').reverse().toArray();
      const refreshedDrafts = await db.drafts.orderBy('timestamp').reverse().toArray();

      setWorkspaces(
        refreshedWorkspaces.some((w) => w.id === 'default')
          ? refreshedWorkspaces
          : [DEFAULT_WORKSPACE, ...refreshedWorkspaces]
      );
      setAllDocuments(
        refreshedDocs.map((d) => ({
          ...d,
          enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
          workspaceId: d.workspaceId || 'default',
        }))
      );
      setAllDrafts(
        refreshedDrafts.map((d) => ({
          ...d,
          workspaceId: d.workspaceId || 'default',
        }))
      );

      if (
        snapshot.activeWorkspaceId &&
        normalizedWorkspaces.some((w) => w.id === snapshot.activeWorkspaceId)
      ) {
        switchWorkspace(snapshot.activeWorkspaceId);
      }

      return {
        documentsCount: normalizedDocs.length,
        draftsCount: normalizedDrafts.length,
        workspacesCount: normalizedWorkspaces.length,
      };
    },
    [switchWorkspace]
  );

  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...newConfig };
      if (isConfigLoadedRef.current) {
        saveConfigToDualStorage(next);
      }
      return next;
    });
  }, []);

  const activeProfile =
    config.profiles.find((p) => p.id === config.activeProfileId) || config.profiles[0];

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
        activeProfileId:
          prev.activeProfileId === profileId ? filtered[0]?.id || '' : prev.activeProfileId,
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

  const addDocument = useCallback(
    async (file: File) => {
      const text = await parseFile(file);
      if (!text || text.trim().length === 0) {
        throw new Error('File content is empty or could not be parsed.');
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const docType: DocumentContext['type'] =
        ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'md' ? 'md' : 'txt';

      const docId = generateId();
      const newDoc: DocumentContext = {
        id: docId,
        name: file.name,
        type: docType,
        content: text,
        timestamp: Date.now(),
        sizeBytes: file.size || text.length,
        enabled: true,
        workspaceId: activeWorkspaceId,
      };

      // Index full document
      await db.documents.put(newDoc);

      // Slice and index semantic chunks for BM25 retrieval
      const chunks = chunkDocumentText(docId, file.name, text);
      if (chunks.length > 0) {
        await db.chunks.bulkPut(chunks);
      }

      setAllDocuments((prev) => [newDoc, ...prev]);
    },
    [activeWorkspaceId]
  );

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
        workspaceId: activeWorkspaceId,
      };

      await db.documents.put(newDoc);
      const chunks = chunkDocumentText(docId, name, content);
      if (chunks.length > 0) {
        await db.chunks.bulkPut(chunks);
      }

      setAllDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    },
    [activeWorkspaceId]
  );

  const toggleDocumentEnabled = useCallback(async (id: string) => {
    setAllDocuments((prev) =>
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
    setAllDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  const clearDocuments = useCallback(async () => {
    const docsToDelete = allDocuments.filter(
      (d) => (d.workspaceId || 'default') === activeWorkspaceId
    );
    for (const doc of docsToDelete) {
      await db.documents.delete(doc.id);
      await db.chunks.where('documentId').equals(doc.id).delete();
    }
    setAllDocuments((prev) =>
      prev.filter((d) => (d.workspaceId || 'default') !== activeWorkspaceId)
    );
  }, [allDocuments, activeWorkspaceId]);

  const saveDraftToHistory = useCallback(
    async (draft: Omit<DraftHistoryItem, 'id' | 'timestamp'>) => {
      const newItem: DraftHistoryItem = {
        ...draft,
        id: generateId(),
        timestamp: Date.now(),
        workspaceId: draft.workspaceId || activeWorkspaceId,
      };
      await db.drafts.put(newItem);
      setAllDrafts((prev) => [newItem, ...prev]);
    },
    [activeWorkspaceId]
  );

  const deleteDraftFromHistory = useCallback(async (id: string) => {
    await db.drafts.delete(id);
    setAllDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDraftHistory = useCallback(async () => {
    const draftsToDelete = allDrafts.filter(
      (d) => (d.workspaceId || 'default') === activeWorkspaceId
    );
    for (const draft of draftsToDelete) {
      await db.drafts.delete(draft.id);
    }
    setAllDrafts((prev) =>
      prev.filter((d) => (d.workspaceId || 'default') !== activeWorkspaceId)
    );
  }, [allDrafts, activeWorkspaceId]);

  return (
    <StoreContext.Provider
      value={{
        documents,
        draftHistory,
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        switchWorkspace,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
        exportVaultSnapshot,
        importVaultSnapshot,
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
