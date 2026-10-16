import { describe, it, expect } from 'vitest';
import {
  chunkDocumentText,
  retrieveTopKChunks,
  buildVaultManifest,
  stemAcademicWord,
} from './retrievalEngine';
import { DocumentChunk, DocumentContext } from '../../types';

describe('retrievalEngine', () => {
  it('chunks long text with overlap and injects Contextual Breadcrumb headers', () => {
    const sampleWords = Array.from({ length: 900 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkDocumentText('doc-1', 'test.pdf', sampleWords, 400, 50);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].docName).toBe('test.pdf');
    expect(chunks[0].content).toContain('[Document: test.pdf | Section: General Content | Part 1/');
  });

  it('preserves newlines, Markdown tables, LaTeX equations, and exam question boundaries', () => {
    const academicExamText = [
      '# SECTION A: Linear Algebra & Eigenvalues',
      'Question 1. Given a symmetric matrix A, prove that all eigenvalues are real.',
      '(a) State the spectral theorem.',
      '(b) Compute det(A - \\lambda I) = 0.',
      '',
      'Question 2. Consider the following Markov transition table:',
      '| State | P(S1) | P(S2) |',
      '| :--- | :--- | :--- |',
      '| S1 | 0.8 | 0.2 |',
    ].join('\n');

    const chunks = chunkDocumentText('exam-doc', 'CSC401_2024_Exam.pdf', academicExamText, 380, 60);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].sectionTitle).toBe('SECTION A: Linear Algebra & Eigenvalues');
    // Crucial check: newlines and markdown table structure are preserved, not flattened into spaces
    expect(chunks[0].content).toContain('\n(a) State the spectral theorem.');
    expect(chunks[0].content).toContain('| State | P(S1) | P(S2) |');
  });

  it('ranks relevant chunks higher using BM25F, academic stemming, and filename boosting', () => {
    const chunks: DocumentChunk[] = [
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

  it('guarantees all 10 uploaded past-question documents are represented via Stratified Multi-Doc Allocation', () => {
    // Simulate 10 uploaded past-question documents, each having 4 chunks (40 chunks total)
    const allChunks: DocumentChunk[] = [];
    for (let docIdx = 1; docIdx <= 10; docIdx++) {
      for (let cIdx = 0; cIdx < 4; cIdx++) {
        allChunks.push({
          id: `pq-${docIdx}-chunk-${cIdx}`,
          documentId: `pq-${docIdx}`,
          docName: `Past_Questions_201${docIdx}_CSC301.pdf`,
          chunkIndex: cIdx,
          sectionTitle: `Paper ${docIdx} Question ${cIdx + 1}`,
          content:
            docIdx <= 2
              ? `Past questions exam paper ${docIdx} section ${cIdx}: Derive the Hamiltonian operator and solve.`
              : `Question ${cIdx + 1}: Evaluate the contour integral and residue theorem for complex poles in paper ${docIdx}.`,
          wordCount: 120,
        });
      }
    }

    // Even when only 2 documents literally contain the words "past questions",
    // Stratified Multi-Document Allocation guarantees all 10 documents are represented!
    const retrieved = retrieveTopKChunks(
      'Summarize all my past questions and create a mock exam',
      allChunks,
      20
    );

    const uniqueDocsCovered = new Set(retrieved.map((c) => c.documentId));
    expect(uniqueDocsCovered.size).toBe(10);
  });

  it('normalizes academic plural and irregular inflections via stemAcademicWord', () => {
    expect(stemAcademicWord('questions')).toBe('question');
    expect(stemAcademicWord('matrices')).toBe('matrix');
    expect(stemAcademicWord('hypotheses')).toBe('hypothesis');
    expect(stemAcademicWord('phenomena')).toBe('phenomenon');
  });

  it('builds a complete Vault Inventory Manifest listing all active documents', () => {
    const docs: DocumentContext[] = Array.from({ length: 10 }, (_, i) => ({
      id: `doc-${i + 1}`,
      name: `Past_Question_${2015 + i}.pdf`,
      type: 'pdf',
      content: 'Question 1: Prove the fundamental theorem of calculus. '.repeat(30),
      timestamp: Date.now(),
      sizeBytes: 2048,
      enabled: true,
      chunkCount: 2,
    }));

    const manifest = buildVaultManifest(docs);
    expect(manifest).toContain('10 Active Documents Uploaded');
    expect(manifest).toContain('1. "Past_Question_2015.pdf"');
    expect(manifest).toContain('10. "Past_Question_2024.pdf"');
  });
});
