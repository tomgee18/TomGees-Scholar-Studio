import Dexie, { type Table } from 'dexie';
import { DocumentContext, DraftHistoryItem, DocumentChunk, ChatMessage } from '../types';

export interface SettingRecord {
  key: string;
  value: any;
}

export class ScholarDatabase extends Dexie {
  documents!: Table<DocumentContext, string>;
  drafts!: Table<DraftHistoryItem, string>;
  chunks!: Table<DocumentChunk, string>;
  chatMessages!: Table<ChatMessage, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('TomGeesScholarDB');
    this.version(1).stores({
      documents: 'id, name, type, timestamp',
      drafts: 'id, mode, timestamp, provider, model',
    });
    this.version(2).stores({
      documents: 'id, name, type, timestamp, enabled',
      drafts: 'id, mode, timestamp, provider, model',
    });
    this.version(3).stores({
      documents: 'id, name, type, timestamp, enabled',
      drafts: 'id, mode, timestamp, provider, model',
      chunks: 'id, documentId, docName, chunkIndex',
    });
    this.version(4).stores({
      documents: 'id, name, type, timestamp, enabled',
      drafts: 'id, mode, timestamp, provider, model',
      chunks: 'id, documentId, docName, chunkIndex',
      chatMessages: 'id, conversationId, role, timestamp',
    });
    this.version(5).stores({
      documents: 'id, name, type, timestamp, enabled',
      drafts: 'id, mode, timestamp, provider, model',
      chunks: 'id, documentId, docName, chunkIndex',
      chatMessages: 'id, conversationId, role, timestamp',
      settings: 'key',
    });
  }
}

export const db = new ScholarDatabase();
