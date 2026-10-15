import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatPapersForContext,
  searchCrossref,
  searchArxiv,
  searchSemanticScholar,
  searchScholarlyLiterature,
} from './scholarlyClient';
import { ScholarlyPaper } from '../../types';

describe('scholarlyClient', () => {
  const mockPapers: ScholarlyPaper[] = [
    {
      id: 'crossref:10.1038/s41586-023-00001',
      title: 'Attention Is All You Need in Quantum Computing',
      authors: ['Alice Smith', 'Bob Jones', 'Charlie Brown', 'David Miller'],
      year: 2024,
      abstract: 'We demonstrate quantum transformers with quadratic speedup over classical circuits.',
      doi: '10.1038/s41586-023-00001',
      journal: 'Nature Physics',
      source: 'crossref',
      citationCount: 42,
    },
    {
      id: 'arxiv:2403.99999',
      title: 'Scalable Graph Neural Networks for Dissertation Architectures',
      authors: ['Elena Rostova'],
      year: 2024,
      abstract: 'A novel framework for partitioning academic knowledge graphs.',
      doi: undefined,
      url: 'https://arxiv.org/abs/2403.99999',
      journal: 'arXiv Preprint',
      source: 'arxiv',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatPapersForContext', () => {
    it('returns empty string when given empty array', () => {
      expect(formatPapersForContext([])).toBe('');
    });

    it('formats multiple papers with authentic DOIs, author truncation, and abstracts', () => {
      const formatted = formatPapersForContext(mockPapers);

      expect(formatted).toContain('=== VERIFIED OPEN SCHOLARLY LITERATURE (GROUNDING EVIDENCE) ===');
      expect(formatted).toContain('Alice Smith, Bob Jones, Charlie Brown et al.');
      expect(formatted).toContain('(2024)');
      expect(formatted).toContain('DOI: https://doi.org/10.1038/s41586-023-00001');
      expect(formatted).toContain('Nature Physics');
      expect(formatted).toContain('We demonstrate quantum transformers');
      expect(formatted).toContain('Scalable Graph Neural Networks');
      expect(formatted).toContain('=== END SCHOLARLY EVIDENCE ===');
    });
  });

  describe('searchCrossref', () => {
    it('parses Crossref JSON response correctly', async () => {
      const mockResponse = {
        message: {
          items: [
            {
              title: ['Decentralized Ledger Consensus Mechanisms'],
              author: [{ given: 'Satoshi', family: 'Nakamoto' }],
              issued: { 'date-parts': [[2023, 5]] },
              DOI: '10.1145/1234567.890',
              'container-title': ['ACM Transactions on Systems'],
              'is-referenced-by-count': 150,
              abstract: '<jats:p>A peer-to-peer electronic cash system analysis.</jats:p>',
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await searchCrossref('consensus mechanisms', 3);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Decentralized Ledger Consensus Mechanisms');
      expect(results[0].authors).toEqual(['Satoshi Nakamoto']);
      expect(results[0].year).toBe(2023);
      expect(results[0].doi).toBe('10.1145/1234567.890');
      expect(results[0].journal).toBe('ACM Transactions on Systems');
      expect(results[0].citationCount).toBe(150);
      expect(results[0].abstract).toBe('A peer-to-peer electronic cash system analysis.');
      expect(results[0].source).toBe('crossref');
    });
  });

  describe('searchArxiv', () => {
    it('parses arXiv Atom XML response correctly', async () => {
      const mockXml = `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Quantum Teleportation Protocols</title>
            <summary>Experimental verification of Bell state transfer.</summary>
            <id>http://arxiv.org/abs/2401.12345</id>
            <author><name>Anton Zeilinger</name></author>
            <published>2024-01-10T12:00:00Z</published>
          </entry>
        </feed>
      `;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockXml,
      } as Response);

      const results = await searchArxiv('quantum teleportation', 3);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Quantum Teleportation Protocols');
      expect(results[0].authors).toEqual(['Anton Zeilinger']);
      expect(results[0].year).toBe(2024);
      expect(results[0].url).toBe('http://arxiv.org/abs/2401.12345');
      expect(results[0].journal).toBe('arXiv Preprint');
      expect(results[0].source).toBe('arxiv');
    });
  });

  describe('searchSemanticScholar', () => {
    it('parses Semantic Scholar Graph API response correctly', async () => {
      const mockResponse = {
        data: [
          {
            title: 'Transformer Scaling Laws in Academic Literature',
            authors: [{ name: 'Vaswani Ashish' }],
            year: 2022,
            abstract: 'Empirical scaling results across compute regimes.',
            citationCount: 500,
            externalIds: { DOI: '10.1007/978-3-030-1' },
            url: 'https://semanticscholar.org/paper/12345',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await searchSemanticScholar('transformer scaling', 3);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Transformer Scaling Laws in Academic Literature');
      expect(results[0].authors).toEqual(['Vaswani Ashish']);
      expect(results[0].year).toBe(2022);
      expect(results[0].doi).toBe('10.1007/978-3-030-1');
      expect(results[0].citationCount).toBe(500);
      expect(results[0].source).toBe('semanticscholar');
    });
  });

  describe('searchScholarlyLiterature multi-source deduplication', () => {
    it('deduplicates identical papers across Crossref and Semantic Scholar', async () => {
      // Mock fetch to simulate Crossref, arXiv, and Semantic Scholar
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('api.crossref.org')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              message: {
                items: [
                  {
                    title: ['Unified Theory of Quantum Gravity'],
                    author: [{ given: 'Stephen', family: 'Hawking' }],
                    DOI: '10.1016/j.physletb.2023.01.001',
                    abstract: 'Singularities in cosmology.',
                  },
                ],
              },
            }),
          });
        }
        if (url.includes('export.arxiv.org')) {
          return Promise.resolve({
            ok: true,
            text: async () => `
              <feed xmlns="http://www.w3.org/2005/Atom">
                <entry>
                  <title>arXiv Paper on Quantum Gravity</title>
                  <summary>String theory dualities.</summary>
                  <id>http://arxiv.org/abs/2301.00001</id>
                  <author><name>Leonard Susskind</name></author>
                  <published>2023-01-05T00:00:00Z</published>
                </entry>
              </feed>
            `,
          });
        }
        if (url.includes('api.semanticscholar.org')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                {
                  // Same DOI as Crossref paper above -> should be deduplicated
                  title: 'Unified Theory of Quantum Gravity',
                  authors: [{ name: 'Stephen Hawking' }],
                  externalIds: { DOI: '10.1016/j.physletb.2023.01.001' },
                },
              ],
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const papers = await searchScholarlyLiterature('quantum gravity', 5);

      expect(papers.length).toBe(2);
      const titles = papers.map((p) => p.title);
      expect(titles).toContain('Unified Theory of Quantum Gravity');
      expect(titles).toContain('arXiv Paper on Quantum Gravity');
    });
  });
});
