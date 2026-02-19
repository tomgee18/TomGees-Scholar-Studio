
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { DocumentContext, AppConfig, AIProvider, DEFAULT_SYSTEM_PROMPT, OllamaModel } from '../types';
import { parseFile } from '../lib/parsers/index';
import { listOllamaModels } from '../lib/ai/ollamaProvider';

interface ContextStoreType {
  documents: DocumentContext[];
  addDocument: (file: File) => Promise<void>;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  getFullContextString: () => string;
  availableOllamaModels: OllamaModel[];
  refreshOllamaModels: () => Promise<void>;
}

const StoreContext = createContext<ContextStoreType | undefined>(undefined);

const LOCAL_STORAGE_CONFIG_KEY = 'tomgees_config_v1';
const LOCAL_STORAGE_DOCS_KEY = 'tomgees_docs_v1';

export const ContextStoreProvider = ({ children }: { children?: ReactNode }) => {
  const [documents, setDocuments] = useState<DocumentContext[]>([]);
  const [isDocsLoaded, setIsDocsLoaded] = useState(false);
  const [availableOllamaModels, setAvailableOllamaModels] = useState<OllamaModel[]>([]);
  
  // Initialize config
  const [config, setConfig] = useState<AppConfig>({
    aiProvider: AIProvider.OPENROUTER_CLOUD,
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: '',
    openRouterApiKey: '',
    openRouterModel: 'google/gemini-2.0-flash-001',
    customSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    webAccessEnabled: false
  });

  // Load saved data on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (savedConfig) {
        setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
      }
      
      const savedDocs = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
      setIsDocsLoaded(true);
    } catch (e) {
      console.warn("Failed to load data from local storage");
      setIsDocsLoaded(true);
    }
  }, []);

  // Persist Config
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn("Failed to save settings");
    }
  }, [config]);

  // Persist Docs
  useEffect(() => {
    if (!isDocsLoaded) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(documents));
    } catch (e) {
      console.warn("Failed to save documents");
    }
  }, [documents, isDocsLoaded]);

  // Optimized Fetch & Update for Models
  const refreshOllamaModels = useCallback(async () => {
    if (!config.ollamaEndpoint) return;
    try {
      const models = await listOllamaModels(config.ollamaEndpoint);
      
      // Only update state if models have changed to avoid re-renders
      // Comparing by name length and content
      setAvailableOllamaModels(prev => {
        if (prev.length === models.length && prev.every((val, index) => val.name === models[index].name)) {
            return prev;
        }
        return models;
      });
    } catch (err) {
      console.warn("Ollama models could not be refreshed", err);
      // We do not clear models on error to prevent UI flicker during transient network issues
    }
  }, [config.ollamaEndpoint]);

  // Live Polling when Provider is OLLAMA
  useEffect(() => {
    if (config.aiProvider === AIProvider.OLLAMA_LOCAL) {
        refreshOllamaModels(); // Immediate fetch
        const interval = setInterval(refreshOllamaModels, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }
  }, [config.aiProvider, refreshOllamaModels]);

  // Auto-Select Logic separate from polling to ensure clean dependencies
  useEffect(() => {
      if (availableOllamaModels.length > 0) {
        // If current model is empty OR not found in the new list, select the first one
        const isCurrentValid = availableOllamaModels.some(m => m.name === config.ollamaModel);
        if (!config.ollamaModel || !isCurrentValid) {
          setConfig(prev => ({ ...prev, ollamaModel: availableOllamaModels[0].name }));
        }
      }
  }, [availableOllamaModels, config.ollamaModel]);

  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const getFullContextString = useCallback(() => {
    if (documents.length === 0) return "";
    return documents.map(doc => `--- SOURCE: ${doc.name} (${doc.type}) ---\n${doc.content}\n`).join('\n');
  }, [documents]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const addDocument = useCallback(async (file: File) => {
    try {
        const text = await parseFile(file);
        if (!text || text.trim().length === 0) {
            throw new Error("File content is empty or could not be parsed.");
        }
        const newDoc: DocumentContext = {
          id: generateId(),
          name: file.name,
          type: file.name.endsWith('.pdf') ? 'pdf' : (file.name.endsWith('.md') ? 'md' : 'txt'),
          content: text,
          timestamp: Date.now()
        };
        setDocuments(prev => [...prev, newDoc]);
    } catch (error: any) {
        console.error("Failed to parse file", error);
        throw error;
    }
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  }, []);

  const clearDocuments = useCallback(() => {
    setDocuments([]);
  }, []);

  return (
    <StoreContext.Provider value={{ 
      documents, 
      addDocument, 
      removeDocument,
      clearDocuments,
      config, 
      updateConfig, 
      getFullContextString,
      availableOllamaModels,
      refreshOllamaModels
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a ContextStoreProvider");
  }
  return context;
};
