import { describe, it, expect } from 'vitest';
import { chunkDocumentText, retrieveTopKChunks } from './retrievalEngine';

describe('retrievalEngine', () => {
  it('chunks long text with overlap properly', () => {
    const sampleWords = Array.from({ length: 900 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkDocumentText('doc-1', 'test.pdf', sampleWords, 400, 50);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].docName).toBe('test.pdf');
  });

  it('ranks relevant chunks higher using BM25', () => {
    const chunks = [
      {
        id: 'c1',
        documentId: 'd1',
        docName: 'doc1.pdf',
        chunkIndex: 0,
        content: 'The quantum entanglement phenomenon exhibits non-local correlations across distances.',
        wordCount: 10,
      },
      {
        id: 'c2',
        documentId: 'd1',
        docName: 'doc1.pdf',
        chunkIndex: 1,
        content: 'Urban farming and hydroponic agriculture improve local food resilience in cities.',
        wordCount: 10,
      },
    ];

    const results = retrieveTopKChunks('Explain quantum entanglement mechanisms', chunks, 1);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('c1');
  });
});
