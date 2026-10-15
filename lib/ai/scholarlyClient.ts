import { ScholarlyPaper } from '../../types';

const FETCH_TIMEOUT_MS = 6000;

/**
 * Strips HTML and XML tags from abstracts or text
 */
const cleanText = (str?: string): string => {
  if (!str) return '';
  return str
    .replace(/<jats:[^>]+>/gi, '')
    .replace(/<\/jats:[^>]+>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Searches Crossref for peer-reviewed journal papers and official DOIs.
 */
export const searchCrossref = async (query: string, maxResults = 5): Promise<ScholarlyPaper[]> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const encoded = encodeURIComponent(query.trim());
    const url = `https://api.crossref.org/works?query=${encoded}&rows=${maxResults}&sort=relevance`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TomGees-Scholar-Studio/1.0 (mailto:scholarstudio@tomgees.internal)',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.message?.items || [];

    return items
      .filter((item: Record<string, unknown>) => Boolean(item.title && Array.isArray(item.title) && item.title.length > 0))
      .map((item: Record<string, unknown>): ScholarlyPaper => {
        const titleArr = item.title as string[];
        const rawTitle = titleArr[0] || 'Untitled Publication';
        const authorsArr = Array.isArray(item.author)
          ? (item.author as Array<{ given?: string; family?: string; name?: string }>)
              .map((a) => (a.name ? a.name : `${a.given || ''} ${a.family || ''}`.trim()))
              .filter(Boolean)
          : [];

        const issued = item.issued as { 'date-parts'?: number[][] } | undefined;
        const year = issued?.['date-parts']?.[0]?.[0] || undefined;
        const doi = typeof item.DOI === 'string' ? item.DOI : undefined;
        const journal = Array.isArray(item['container-title']) && item['container-title'][0] ? (item['container-title'][0] as string) : undefined;
        const citationCount = typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : undefined;

        return {
          id: doi ? `crossref:${doi}` : `crossref:${encodeURIComponent(rawTitle.slice(0, 30))}`,
          title: cleanText(rawTitle),
          authors: authorsArr.length > 0 ? authorsArr : ['Unknown Authors'],
          year,
          abstract: cleanText(typeof item.abstract === 'string' ? item.abstract : undefined),
          doi,
          url: doi ? `https://doi.org/${doi}` : typeof item.URL === 'string' ? item.URL : undefined,
          journal,
          source: 'crossref',
          citationCount,
        };
      });
  } catch (err) {
    console.warn('Crossref search skipped or timed out:', err);
    return [];
  }
};

/**
 * Searches arXiv Atom API for preprints and STEM research papers.
 */
export const searchArxiv = async (query: string, maxResults = 5): Promise<ScholarlyPaper[]> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const encoded = encodeURIComponent(query.trim());
    const url = `https://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${maxResults}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const xmlText = await res.text();

    const papers: ScholarlyPaper[] = [];

    // Parse with DOMParser if in browser/DOM environment, or regex fallback
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const entries = xmlDoc.getElementsByTagName('entry');

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const titleEl = entry.getElementsByTagName('title')[0];
        const summaryEl = entry.getElementsByTagName('summary')[0];
        const publishedEl = entry.getElementsByTagName('published')[0];
        const idEl = entry.getElementsByTagName('id')[0];
        const doiEl = entry.getElementsByTagName('arxiv:doi')[0];

        const authorEls = entry.getElementsByTagName('author');
        const authors: string[] = [];
        for (let j = 0; j < authorEls.length; j++) {
          const nameEl = authorEls[j].getElementsByTagName('name')[0];
          if (nameEl?.textContent) authors.push(nameEl.textContent.trim());
        }

        const title = cleanText(titleEl?.textContent || '');
        if (!title) continue;

        const year = publishedEl?.textContent ? new Date(publishedEl.textContent).getFullYear() : undefined;
        const arxivUrl = idEl?.textContent?.trim();
        const doi = doiEl?.textContent?.trim();

        papers.push({
          id: `arxiv:${arxivUrl || title.slice(0, 30)}`,
          title,
          authors: authors.length > 0 ? authors : ['arXiv Collaborators'],
          year,
          abstract: cleanText(summaryEl?.textContent || ''),
          doi,
          url: arxivUrl,
          journal: 'arXiv Preprint',
          source: 'arxiv',
        });
      }
    } else {
      // Regex fallback for non-DOM environments
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      let match;
      while ((match = entryRegex.exec(xmlText)) !== null) {
        const entryBlock = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(entryBlock);
        const summaryMatch = /<summary>([\s\S]*?)<\/summary>/i.exec(entryBlock);
        const idMatch = /<id>([\s\S]*?)<\/id>/i.exec(entryBlock);
        const pubMatch = /<published>([\s\S]*?)<\/published>/i.exec(entryBlock);

        const title = cleanText(titleMatch?.[1] || '');
        if (!title) continue;

        const year = pubMatch?.[1] ? new Date(pubMatch[1]).getFullYear() : undefined;
        const arxivUrl = idMatch?.[1]?.trim();

        papers.push({
          id: `arxiv:${arxivUrl || title.slice(0, 30)}`,
          title,
          authors: ['arXiv Researchers'],
          year,
          abstract: cleanText(summaryMatch?.[1] || ''),
          url: arxivUrl,
          journal: 'arXiv Preprint',
          source: 'arxiv',
        });
      }
    }

    return papers;
  } catch (err) {
    console.warn('arXiv search skipped or timed out:', err);
    return [];
  }
};

/**
 * Searches Semantic Scholar Graph API for academic citations and abstracts.
 */
export const searchSemanticScholar = async (query: string, maxResults = 5): Promise<ScholarlyPaper[]> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const encoded = encodeURIComponent(query.trim());
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encoded}&limit=${maxResults}&fields=title,authors,year,abstract,citationCount,url,externalIds`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data || [];

    return items
      .filter((item: Record<string, unknown>) => Boolean(item.title))
      .map((item: Record<string, unknown>): ScholarlyPaper => {
        const rawTitle = typeof item.title === 'string' ? item.title : 'Untitled';
        const authorsArr = Array.isArray(item.authors)
          ? (item.authors as Array<{ name?: string }>).map((a) => a.name).filter((n): n is string => Boolean(n))
          : [];

        const externalIds = item.externalIds as Record<string, string> | undefined;
        const doi = externalIds?.DOI;
        const year = typeof item.year === 'number' ? item.year : undefined;
        const citationCount = typeof item.citationCount === 'number' ? item.citationCount : undefined;

        return {
          id: doi ? `semanticscholar:${doi}` : `semanticscholar:${encodeURIComponent(rawTitle.slice(0, 30))}`,
          title: cleanText(rawTitle),
          authors: authorsArr.length > 0 ? authorsArr : ['Semantic Scholar Indexed'],
          year,
          abstract: cleanText(typeof item.abstract === 'string' ? item.abstract : undefined),
          doi,
          url: typeof item.url === 'string' ? item.url : doi ? `https://doi.org/${doi}` : undefined,
          source: 'semanticscholar',
          citationCount,
        };
      });
  } catch (err) {
    console.warn('Semantic Scholar search skipped or timed out:', err);
    return [];
  }
};

/**
 * Multi-Source Scholarly Retrieval Engine:
 * Queries Crossref, arXiv, and Semantic Scholar concurrently, deduplicates results,
 * and ranks papers by quality and presence of abstract and verified DOI.
 */
export const searchScholarlyLiterature = async (
  query: string,
  limit = 5
): Promise<ScholarlyPaper[]> => {
  const cleanQuery = query.replace(/[^\w\s-]/g, ' ').trim();
  if (!cleanQuery || cleanQuery.length < 3) return [];

  // Query all three sources in parallel
  const [crossrefRes, arxivRes, semanticRes] = await Promise.allSettled([
    searchCrossref(cleanQuery, Math.max(3, limit)),
    searchArxiv(cleanQuery, Math.max(3, limit)),
    searchSemanticScholar(cleanQuery, Math.max(3, limit)),
  ]);

  const allPapers: ScholarlyPaper[] = [
    ...(crossrefRes.status === 'fulfilled' ? crossrefRes.value : []),
    ...(arxivRes.status === 'fulfilled' ? arxivRes.value : []),
    ...(semanticRes.status === 'fulfilled' ? semanticRes.value : []),
  ];

  // Deduplicate by normalized title or DOI
  const seenKeys = new Set<string>();
  const uniquePapers: ScholarlyPaper[] = [];

  for (const paper of allPapers) {
    const normTitle = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    const key = paper.doi ? `doi:${paper.doi.toLowerCase()}` : `title:${normTitle}`;

    if (!seenKeys.has(key) && normTitle.length > 5) {
      seenKeys.add(key);
      uniquePapers.push(paper);
    }
  }

  // Rank papers: prioritize papers with DOI and non-empty abstract
  uniquePapers.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.doi) scoreA += 4;
    if (b.doi) scoreB += 4;

    if (a.abstract && a.abstract.length > 50) scoreA += 3;
    if (b.abstract && b.abstract.length > 50) scoreB += 3;

    if (a.year) scoreA += 1;
    if (b.year) scoreB += 1;

    if ((a.citationCount || 0) > 0) scoreA += 2;
    if ((b.citationCount || 0) > 0) scoreB += 2;

    return scoreB - scoreA;
  });

  return uniquePapers.slice(0, limit);
};

/**
 * Formats a list of scholarly papers into an injected AI grounding context block.
 */
export const formatPapersForContext = (papers: ScholarlyPaper[]): string => {
  if (!papers || papers.length === 0) return '';

  const entries = papers.map((p, idx) => {
    const authorsStr = p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ' et al.' : '');
    const yearStr = p.year ? `(${p.year})` : '(n.d.)';
    const doiStr = p.doi ? ` | DOI: https://doi.org/${p.doi}` : '';
    const venueStr = p.journal ? ` | Published in: ${p.journal}` : '';
    const abstractStr = p.abstract ? `\n   Abstract: "${p.abstract.slice(0, 400)}${p.abstract.length > 400 ? '...' : ''}"` : '';

    return `[Source ${idx + 1}] ${authorsStr} ${yearStr}. "${p.title}"${venueStr}${doiStr}${abstractStr}`;
  });

  return `
=== VERIFIED OPEN SCHOLARLY LITERATURE (GROUNDING EVIDENCE) ===
The following authentic academic papers were retrieved in real-time from Crossref, arXiv, and Semantic Scholar.
Incorporate their findings, cite them inline with author/year and DOI hyperlinks, and list them in the References section:

${entries.join('\n\n')}
=== END SCHOLARLY EVIDENCE ===
`;
};
