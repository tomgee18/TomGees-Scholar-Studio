import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ACADEMIC_SKILLS,
  executeAcademicSkill,
} from './academicSkills';
import { AcademicSkillType, AppConfig, AIProvider } from '../../types';
import * as scholarlyClient from './scholarlyClient';
import * as aiRouter from './aiRouter';

describe('academicSkills', () => {
  const mockConfig: AppConfig = {
    aiProvider: AIProvider.GEMINI_DIRECT,
    activeProfileId: 'deepseek',
    profiles: [],
    geminiApiKey: 'test-key',
    geminiModel: 'gemini-2.5-flash',
    customSystemPrompt: 'Custom scholar prompt',
    webAccessEnabled: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ACADEMIC_SKILLS Catalog', () => {
    it('defines prompt templates for all 4 core academic skills', () => {
      const skills = [
        AcademicSkillType.LITERATURE_DISCOVERY,
        AcademicSkillType.CITATION_GROUNDING,
        AcademicSkillType.COUNTERARGUMENT_FINDER,
        AcademicSkillType.METHODOLOGY_FINDER,
      ];

      for (const skillType of skills) {
        const skill = ACADEMIC_SKILLS[skillType];
        expect(skill).toBeDefined();
        expect(skill.title).toBeTruthy();
        expect(skill.description).toBeTruthy();
        expect(skill.badge).toBeTruthy();

        const prompt = skill.promptTemplate('Artificial General Intelligence', 'Sample thesis draft');
        expect(prompt).toContain('Artificial General Intelligence');
        expect(prompt).toContain('Sample thesis draft');
      }
    });
  });

  describe('executeAcademicSkill', () => {
    it('queries open literature, injects DOIs, and synthesizes grounded result', async () => {
      const mockPapers = [
        {
          id: 'crossref:10.1234/test',
          title: 'Deep Learning Empirical Limits',
          authors: ['John Doe'],
          year: 2024,
          abstract: 'We establish scaling boundaries.',
          doi: '10.1234/test',
          journal: 'JMLR',
          source: 'crossref' as const,
        },
      ];

      vi.spyOn(scholarlyClient, 'searchScholarlyLiterature').mockResolvedValue(mockPapers);
      vi.spyOn(aiRouter, 'sendAIMessage').mockResolvedValue(
        '# Literature Discovery Synthesis\nFoundational work by John Doe (2024) [DOI: https://doi.org/10.1234/test]...'
      );

      const statusUpdates: string[] = [];
      const result = await executeAcademicSkill(
        AcademicSkillType.LITERATURE_DISCOVERY,
        'deep learning scaling limits',
        mockConfig,
        'My thesis posits that compute is the primary bottleneck.',
        (status) => statusUpdates.push(status)
      );

      expect(result.skill).toBe(AcademicSkillType.LITERATURE_DISCOVERY);
      expect(result.papers).toHaveLength(1);
      expect(result.papers[0].title).toBe('Deep Learning Empirical Limits');
      expect(result.summary).toContain('John Doe (2024)');
      expect(result.summary).toContain('https://doi.org/10.1234/test');
      expect(statusUpdates.length).toBeGreaterThanOrEqual(2);
    });
  });
});
