import { DocumentChunk } from '../../types';

/**
 * Splits raw document text into overlapping semantic chunks (~400 words with 50-word overlap)
 */
export const chunkDocumentText = (
  documentId: string,
  docName: string,
  text: string,
  chunkSizeWords = 400,
  overlapWords = 50
): DocumentChunk[] => {
  if (!text || !text.trim()) return [];

  const words = text.trim().split(/\s+/);
  if (words.length <= chunkSizeWords) {
    return [
      {
        id: `${documentId}-chunk-0`,
        documentId,
        docName,
        chunkIndex: 0,
        content: text.trim(),
        wordCount: words.length,
      },
    ];
  }

  const chunks: DocumentChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < words.length) {
    const chunkWords = words.slice(startIndex, startIndex + chunkSizeWords);
    if (chunkWords.length === 0) break;

    chunks.push({
      id: `${documentId}-chunk-${chunkIndex}`,
      documentId,
      docName,
      chunkIndex,
      content: chunkWords.join(' '),
      wordCount: chunkWords.length,
    });

    chunkIndex++;
    startIndex += chunkSizeWords - overlapWords;
  }

  return chunks;
};

/**
 * Client-side BM25 relevance scoring algorithm.
 * Evaluates match frequency, query saturation, and document length normalization.
 */
export const retrieveTopKChunks = (
  query: string,
  chunks: DocumentChunk[],
  topK = 15
): DocumentChunk[] => {
  if (!query || !query.trim() || chunks.length === 0) {
    return chunks.slice(0, topK);
  }

  // Tokenize & normalize query into unique search terms
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
    'from', 'up', 'down', 'of', 'off', 'over', 'under', 'and', 'but', 'or', 'so', 'it', 'its', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'how',
    'can', 'could', 'should', 'would', 'will', 'do', 'does', 'did', 'having', 'have', 'has'
  ]);

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (queryTerms.length === 0) {
    return chunks.slice(0, topK);
  }

  // Calculate average chunk length
  const totalLength = chunks.reduce((acc, c) => acc + c.wordCount, 0);
  const avgDocLength = totalLength / chunks.length || 1;

  // BM25 parameters
  const k1 = 1.2;
  const b = 0.75;

  // Document Frequency (DF) for each term
  const df: Record<string, number> = {};
  for (const term of queryTerms) {
    df[term] = 0;
    for (const chunk of chunks) {
      if (chunk.content.toLowerCase().includes(term)) {
        df[term]++;
      }
    }
  }

  const N = chunks.length;

  // Score each chunk
  const scoredChunks = chunks.map((chunk) => {
    const chunkTextLower = chunk.content.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      const termDF = df[term] || 0;
      // Inverse Document Frequency (IDF) with smoothing
      const idf = Math.log(1 + (N - termDF + 0.5) / (termDF + 0.5));

      // Term Frequency (TF) in current chunk
      let tf = 0;
      let pos = 0;
      while ((pos = chunkTextLower.indexOf(term, pos)) !== -1) {
        tf++;
        pos += term.length;
      }

      if (tf > 0) {
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (chunk.wordCount / avgDocLength));
        score += idf * (numerator / denominator);
      }
    }

    return { chunk, score };
  });

  // Sort descending by relevance score
  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, topK).map((sc) => sc.chunk);
};
