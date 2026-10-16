import { DocumentChunk, DocumentContext } from '../../types';

/**
 * Incremented whenever the chunking algorithm or contextual breadcrumb format changes.
 * Triggers automatic background re-indexing of existing Vault documents on startup.
 */
export const CHUNK_ENGINE_VERSION = 2;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
  'from', 'up', 'down', 'of', 'off', 'over', 'under', 'and', 'but', 'or',
  'so', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'how', 'can', 'could',
  'should', 'would', 'will', 'do', 'does', 'did', 'having', 'have', 'has',
  'please', 'give', 'tell', 'make', 'use', 'using', 'based', 'all', 'my',
]);

/**
 * Lightweight deterministic academic suffix stemmer.
 * Normalizes plural and inflectional variants ("questions" -> "question",
 * "matrices" -> "matrix", "derivatives" -> "deriv", "equations" -> "equation").
 */
export const stemAcademicWord = (word: string): string => {
  const w = word.toLowerCase().trim();
  if (w.length <= 3) return w;

  // Academic irregulars
  if (w === 'matrices') return 'matrix';
  if (w === 'vertices') return 'vertex';
  if (w === 'indices') return 'index';
  if (w === 'analyses') return 'analysis';
  if (w === 'theses') return 'thesis';
  if (w === 'hypotheses') return 'hypothesis';
  if (w === 'phenomena') return 'phenomenon';
  if (w === 'criteria') return 'criterion';
  if (w === 'equilibria') return 'equilibrium';

  // Standard suffixes
  if (w.endsWith('ibilities') && w.length > 11) return w.slice(0, -9) + 'ible';
  if (w.endsWith('abilities') && w.length > 11) return w.slice(0, -9) + 'able';
  if (w.endsWith('ications') && w.length > 10) return w.slice(0, -8) + 'ic';
  if (w.endsWith('ication') && w.length > 9) return w.slice(0, -7) + 'ic';
  if (w.endsWith('izations') && w.length > 10) return w.slice(0, -8) + 'ize';
  if (w.endsWith('ization') && w.length > 9) return w.slice(0, -7) + 'ize';
  if (w.endsWith('ies') && w.length > 5) return w.slice(0, -3) + 'y';
  if (w.endsWith('ves') && w.length > 5) return w.slice(0, -3) + 'f';
  if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4 && (w.endsWith('ches') || w.endsWith('shes') || w.endsWith('xes') || w.endsWith('sses'))) {
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 3) {
    return w.slice(0, -1);
  }

  return w;
};

/**
 * Word-boundary tokenizer with academic stemming.
 * Preserves course codes, years, and question numbers (e.g. "csc401", "2023", "q1").
 */
export const tokenizeAcademicText = (text: string, removeStopWords = true): string[] => {
  if (!text) return [];
  const rawTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const filtered = removeStopWords ? rawTokens.filter((t) => !STOP_WORDS.has(t)) : rawTokens;
  return filtered.map(stemAcademicWord);
};

/**
 * Detects whether a line is an academic section header, page boundary, or exam division.
 */
const isHeadingLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (/^#{1,6}\s+\S/.test(trimmed)) return true;
  if (/^(?:---\s*Page\s+\d+\s*---|\[Page\s+\d+\])/i.test(trimmed)) return true;
  if (/^(?:SECTION|PART|MODULE|CHAPTER|UNIT|PAPER|APPENDIX)\s+[A-Z0-9IVX]+/i.test(trimmed)) return true;
  return false;
};

/**
 * Detects whether a line starts a discrete numbered exam question (e.g. "Question 1", "Q1.", "1.", "2)").
 */
const isExamQuestionStart = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^(?:Question\s+\d+|Q\.?\s*\d+|\d{1,2}[.)]\s+[A-Z(])/i.test(trimmed);
};

interface StructuralBlock {
  sectionTitle: string;
  text: string;
  wordCount: number;
  isQuestionBlock: boolean;
}

/**
 * Splits raw document text into structure-preserving blocks along headings,
 * exam question boundaries, and paragraphs without stripping newlines or tables.
 */
const parseStructuralBlocks = (rawText: string): StructuralBlock[] => {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks: StructuralBlock[] = [];

  let currentSection = 'General Content';
  let buffer: string[] = [];
  let currentIsQuestion = false;

  const flushBuffer = () => {
    const joined = buffer.join('\n').trim();
    if (joined) {
      const wc = joined.split(/\s+/).filter(Boolean).length;
      if (wc > 0) {
        blocks.push({
          sectionTitle: currentSection,
          text: joined,
          wordCount: wc,
          isQuestionBlock: currentIsQuestion,
        });
      }
    }
    buffer = [];
    currentIsQuestion = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isHeadingLine(trimmed)) {
      flushBuffer();
      currentSection = trimmed.replace(/^#{1,6}\s+/, '').replace(/^---\s*|\s*---$/g, '').trim();
      buffer.push(line);
      continue;
    }

    if (isExamQuestionStart(trimmed)) {
      // Start a new block at major numbered exam questions so questions stay cohesive
      flushBuffer();
      currentIsQuestion = true;
      buffer.push(line);
      continue;
    }

    // Double newline boundary when not inside a short question block
    if (trimmed === '' && buffer.length > 0) {
      const currentWords = buffer.join(' ').split(/\s+/).filter(Boolean).length;
      // If we are accumulating normal prose paragraphs and have a reasonable paragraph, flush
      if (!currentIsQuestion && currentWords >= 60) {
        flushBuffer();
        continue;
      }
      // Even inside a question block, if it has grown very large (>280 words), flush on blank line
      if (currentIsQuestion && currentWords >= 280) {
        flushBuffer();
        continue;
      }
    }

    buffer.push(line);
  }

  flushBuffer();
  return blocks;
};

/**
 * Splits a single oversized block along sentence boundaries with sentence-aligned overlap.
 */
const splitOversizedBlock = (
  text: string,
  maxWords: number,
  overlapWords: number
): string[] => {
  const sentences = text.split(/(?<=[.?!])\s+(?=[A-Z0-9(["])/g);
  if (sentences.length <= 1) {
    // Fallback to line or word window while preserving line breaks where possible
    const words = text.split(/\s+/);
    const slices: string[] = [];
    let start = 0;
    const step = Math.max(50, maxWords - overlapWords);
    while (start < words.length) {
      slices.push(words.slice(start, start + maxWords).join(' '));
      start += step;
    }
    return slices;
  }

  const subChunks: string[] = [];
  let currentSentences: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sWords = sentence.split(/\s+/).filter(Boolean).length;
    if (currentWords + sWords > maxWords && currentSentences.length > 0) {
      subChunks.push(currentSentences.join(' ').trim());

      // Retain trailing sentences up to overlapWords for continuity
      const overlapBuffer: string[] = [];
      let overlapCount = 0;
      for (let i = currentSentences.length - 1; i >= 0; i--) {
        const wCount = currentSentences[i].split(/\s+/).filter(Boolean).length;
        if (overlapCount + wCount > overlapWords && overlapBuffer.length > 0) break;
        overlapBuffer.unshift(currentSentences[i]);
        overlapCount += wCount;
      }
      currentSentences = [...overlapBuffer];
      currentWords = overlapCount;
    }

    currentSentences.push(sentence);
    currentWords += sWords;
  }

  if (currentSentences.length > 0) {
    subChunks.push(currentSentences.join(' ').trim());
  }

  return subChunks;
};

/**
 * Hierarchical Structure-Aware Academic Chunker with Contextual Breadcrumb Injection.
 * - Preserves newlines, Markdown tables, LaTeX blocks, and numbered exam questions.
 * - Prepends [Source: docName | Section: sectionTitle | Chunk X/Y] to each chunk.
 */
export const chunkDocumentText = (
  documentId: string,
  docName: string,
  text: string,
  chunkSizeWords = 380,
  overlapWords = 60
): DocumentChunk[] => {
  if (!text || !text.trim()) return [];

  const blocks = parseStructuralBlocks(text);
  if (blocks.length === 0) return [];

  const rawChunks: Array<{ sectionTitle: string; content: string; wordCount: number }> = [];
  let accBlocks: StructuralBlock[] = [];
  let accWords = 0;
  let activeSection = blocks[0].sectionTitle;

  const flushAccumulated = () => {
    if (accBlocks.length === 0) return;
    const combinedText = accBlocks.map((b) => b.text).join('\n\n').trim();
    const wc = combinedText.split(/\s+/).filter(Boolean).length;
    if (wc > 0) {
      rawChunks.push({
        sectionTitle: activeSection,
        content: combinedText,
        wordCount: wc,
      });
    }
    accBlocks = [];
    accWords = 0;
  };

  for (const block of blocks) {
    // If a single block exceeds chunkSizeWords, flush current accumulator and split the oversized block
    if (block.wordCount > chunkSizeWords) {
      flushAccumulated();
      const subSlices = splitOversizedBlock(block.text, chunkSizeWords, overlapWords);
      for (const slice of subSlices) {
        const wc = slice.split(/\s+/).filter(Boolean).length;
        rawChunks.push({
          sectionTitle: block.sectionTitle,
          content: slice,
          wordCount: wc,
        });
      }
      activeSection = block.sectionTitle;
      continue;
    }

    // If adding this block exceeds target chunk size, flush first—and retain 1 trailing block if small for overlap
    if (accWords + block.wordCount > chunkSizeWords && accBlocks.length > 0) {
      const lastBlock = accBlocks[accBlocks.length - 1];
      flushAccumulated();
      if (lastBlock && lastBlock.wordCount <= overlapWords) {
        accBlocks.push(lastBlock);
        accWords += lastBlock.wordCount;
      }
      activeSection = block.sectionTitle;
    }

    if (accBlocks.length === 0) {
      activeSection = block.sectionTitle;
    }
    accBlocks.push(block);
    accWords += block.wordCount;
  }

  flushAccumulated();

  const totalChunks = rawChunks.length;
  return rawChunks.map((rc, idx) => {
    const breadcrumb = `[Document: ${docName} | Section: ${rc.sectionTitle} | Part ${idx + 1}/${totalChunks}]`;
    const enrichedContent = `${breadcrumb}\n${rc.content}`;
    return {
      id: `${documentId}-chunk-${idx}`,
      documentId,
      docName,
      chunkIndex: idx,
      sectionTitle: rc.sectionTitle,
      content: enrichedContent,
      wordCount: rc.wordCount,
    };
  });
};

/**
 * Generates a complete, deterministic Vault Inventory Manifest of all active documents
 * so the LLM always knows the exact number, filenames, formats, and sizes of uploaded files.
 */
export const buildVaultManifest = (documents: DocumentContext[]): string => {
  const activeDocs = documents.filter((d) => d.enabled !== false);
  if (activeDocs.length === 0) return '';

  const rows = activeDocs.map((doc, idx) => {
    const words = doc.content ? doc.content.trim().split(/\s+/).filter(Boolean).length : 0;
    const chunksLabel = doc.chunkCount ? `${doc.chunkCount} chunks` : `${ Math.max(1, Math.ceil(words / 350)) } est. chunks`;
    return `  ${idx + 1}. "${doc.name}" (${doc.type.toUpperCase()} • ${words.toLocaleString()} words • ${chunksLabel})`;
  });

  return [
    `=== CONTEXT VAULT INVENTORY (${activeDocs.length} Active Document${activeDocs.length === 1 ? '' : 's'} Uploaded) ===`,
    ...rows,
    `=== END VAULT INVENTORY ===\n`,
  ].join('\n');
};

/**
 * Computes Jaccard token similarity between two sets of tokens for MMR redundancy penalty.
 */
const computeJaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
};

/**
 * Hybrid BM25F + Academic Stemmer + Bigram Phrase Boost + Stratified Multi-Document MMR Retriever.
 *
 * Guarantees:
 * 1. Every unique document in `chunks` is guaranteed representation (Stratified Per-Document Quota)
 *    so uploading 10 past questions ensures all 10 documents are seen by the AI.
 * 2. Field-weighted BM25F boosts matches in `docName` (3.5x) and `sectionTitle` (2.5x).
 * 3. Bigram phrase boost (2.0x) rewards adjacent multi-word academic terms.
 * 4. Maximal Marginal Relevance (MMR, lambda = 0.75) penalizes redundant chunks.
 * 5. Final chunks are grouped by document and ordered sequentially by `chunkIndex`.
 */
export const retrieveTopKChunks = (
  query: string,
  chunks: DocumentChunk[],
  topK = 20
): DocumentChunk[] => {
  if (chunks.length === 0) return [];

  // Count distinct documents represented in the chunk pool
  const docGroups = new Map<string, DocumentChunk[]>();
  for (const chunk of chunks) {
    const list = docGroups.get(chunk.documentId) || [];
    list.push(chunk);
    docGroups.set(chunk.documentId, list);
  }
  const numDocs = docGroups.size;

  // Ensure effectiveTopK is at least numDocs so every active document gets at least 1 chunk
  const effectiveTopK = Math.max(topK, numDocs);
  if (chunks.length <= effectiveTopK) {
    return [...chunks].sort((a, b) =>
      a.documentId === b.documentId
        ? a.chunkIndex - b.chunkIndex
        : a.docName.localeCompare(b.docName)
    );
  }

  const queryTokens = tokenizeAcademicText(query || '', true);
  const uniqueQueryTerms = Array.from(new Set(queryTokens));

  // Build query bigrams for exact phrase/concept boosting
  const queryBigrams: string[] = [];
  for (let i = 0; i < queryTokens.length - 1; i++) {
    queryBigrams.push(`${queryTokens[i]} ${queryTokens[i + 1]}`);
  }

  // Pre-tokenize each chunk's fields (docName, sectionTitle, body)
  const preparedChunks = chunks.map((chunk) => {
    const docNameTokens = tokenizeAcademicText(chunk.docName, false);
    const sectionTokens = tokenizeAcademicText(chunk.sectionTitle || '', false);
    const bodyTokens = tokenizeAcademicText(chunk.content, true);

    const bodyFreq = new Map<string, number>();
    for (const t of bodyTokens) {
      bodyFreq.set(t, (bodyFreq.get(t) || 0) + 1);
    }

    const docNameSet = new Set(docNameTokens);
    const sectionSet = new Set(sectionTokens);
    const tokenSet = new Set([...docNameTokens, ...sectionTokens, ...bodyTokens]);
    const stemmedJoined = bodyTokens.join(' ');

    return {
      chunk,
      bodyFreq,
      docNameSet,
      sectionSet,
      tokenSet,
      stemmedJoined,
    };
  });

  // Average chunk length for BM25 length normalization
  const totalWords = chunks.reduce((acc, c) => acc + Math.max(1, c.wordCount), 0);
  const avgDocLength = totalWords / chunks.length || 1;
  const k1 = 1.2;
  const b = 0.75;
  const N = chunks.length;

  // Document Frequency (DF) across all chunks
  const df: Record<string, number> = {};
  for (const term of uniqueQueryTerms) {
    let count = 0;
    for (const pc of preparedChunks) {
      if (pc.tokenSet.has(term)) count++;
    }
    df[term] = count;
  }

  // Score every chunk with BM25F + Bigram Boost
  const scored = preparedChunks.map((pc) => {
    let score = 0;

    for (const term of uniqueQueryTerms) {
      const termDF = df[term] || 0;
      const idf = Math.log(1 + (N - termDF + 0.5) / (termDF + 0.5));

      // Field-weighted term frequency (BM25F)
      const bodyTF = pc.bodyFreq.get(term) || 0;
      const docNameHit = pc.docNameSet.has(term) ? 3.5 : 0;
      const sectionHit = pc.sectionSet.has(term) ? 2.5 : 0;
      const weightedTF = bodyTF + docNameHit + sectionHit;

      if (weightedTF > 0) {
        const numerator = weightedTF * (k1 + 1);
        const denominator =
          weightedTF + k1 * (1 - b + b * (Math.max(1, pc.chunk.wordCount) / avgDocLength));
        score += idf * (numerator / denominator);
      }
    }

    // Bigram phrase bonus (2.0x per matching adjacent concept pair)
    for (const bigram of queryBigrams) {
      if (pc.stemmedJoined.includes(bigram)) {
        score += 2.0;
      }
    }

    // Slight structural bonus for chunks containing explicit numbered exam questions when in exam/question queries
    if (/(?:^\s*(?:Question\s+\d+|Q\d+|\d+[.)]\s+))/im.test(pc.chunk.content)) {
      score += 0.35;
    }

    return {
      ...pc,
      rawScore: score,
    };
  });

  const maxRawScore = Math.max(...scored.map((s) => s.rawScore), 1);

  // Group scored chunks by documentId, sorted by rawScore descending (tie-break by chunkIndex ascending)
  const scoredByDoc = new Map<string, typeof scored>();
  for (const item of scored) {
    const list = scoredByDoc.get(item.chunk.documentId) || [];
    list.push(item);
    scoredByDoc.set(item.chunk.documentId, list);
  }
  for (const list of scoredByDoc.values()) {
    list.sort((a, b) =>
      b.rawScore !== a.rawScore ? b.rawScore - a.rawScore : a.chunk.chunkIndex - b.chunk.chunkIndex
    );
  }

  const selectedIds = new Set<string>();
  const selectedItems: typeof scored = [];

  // PASS 1: Stratified Per-Document Coverage Guarantee
  // Every uploaded document gets at least `minPerDoc` chunks (1 or 2) so NO document is ever invisible!
  const minPerDoc = numDocs > 0 ? Math.max(1, Math.min(2, Math.floor(effectiveTopK / numDocs))) : 1;

  for (let round = 0; round < minPerDoc; round++) {
    for (const docList of scoredByDoc.values()) {
      if (selectedItems.length >= effectiveTopK) break;
      const candidate = docList[round];
      if (candidate && !selectedIds.has(candidate.chunk.id)) {
        selectedIds.add(candidate.chunk.id);
        selectedItems.push(candidate);
      }
    }
  }

  // PASS 2: Global BM25F + Maximal Marginal Relevance (MMR, lambda = 0.75) for remaining slots
  const lambda = 0.75;
  const remainingPool = scored.filter((s) => !selectedIds.has(s.chunk.id));

  while (selectedItems.length < effectiveTopK && remainingPool.length > 0) {
    let bestIdx = 0;
    let bestMMR = -Infinity;

    for (let i = 0; i < remainingPool.length; i++) {
      const candidate = remainingPool[i];
      const normRelevance = candidate.rawScore / maxRawScore;

      let maxSim = 0;
      for (const sel of selectedItems) {
        if (sel.chunk.documentId === candidate.chunk.documentId) {
          const sim = computeJaccardSimilarity(candidate.tokenSet, sel.tokenSet);
          if (sim > maxSim) maxSim = sim;
        }
      }

      const mmrScore = lambda * normRelevance - (1 - lambda) * maxSim;
      if (mmrScore > bestMMR) {
        bestMMR = mmrScore;
        bestIdx = i;
      }
    }

    const chosen = remainingPool.splice(bestIdx, 1)[0];
    selectedIds.add(chosen.chunk.id);
    selectedItems.push(chosen);
  }

  // PASS 3: Coherent Document-Grouped Sequential Ordering
  // Group selected chunks by document and order them by chunkIndex so each paper reads naturally
  return selectedItems
    .sort((a, b) => {
      if (a.chunk.documentId === b.chunk.documentId) {
        return a.chunk.chunkIndex - b.chunk.chunkIndex;
      }
      return a.chunk.docName.localeCompare(b.chunk.docName);
    })
    .map((item) => item.chunk);
};
