import Dexie, { type Table } from 'dexie';
import { DocumentContext, DraftHistoryItem, DocumentChunk } from '../types';

export class ScholarDatabase extends Dexie {
  documents!: Table<DocumentContext, string>;
  drafts!: Table<DraftHistoryItem, string>;
  chunks!: Table<DocumentChunk, string>;

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
  }
}

export const db = new ScholarDatabase();
