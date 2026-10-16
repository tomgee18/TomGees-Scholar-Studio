import { describe, it, expect } from 'vitest';
import {
  extractExportSections,
  extractExamQuestions,
  generateBibTeX,
  generateApaReferences,
  markdownToPrintHtml,
} from './exportParser';
import { extractTextFromDocxXml } from './parsers';
import { ScholarlyPaper, DocumentContext } from '../types';

describe('exportParser', () => {
  const sampleCompositeStudyKit = `
# Master Study Guide: Quantum Dynamics

### SECTION 1: High-Yield Core Concept Synthesis
Here is the core summary of quantum state vectors and Hilbert spaces.

### SECTION 2: Master Mock Examination
1. Define the Schrödinger equation and state its primary assumptions.
2. Given a potential well of width L, calculate the first three energy eigenvalues.

### SECTION 3: Official Marking Scheme & Exemplar Answers
1. Mark Allocation: 2 marks for stating the time-dependent form, 2 marks for boundary conditions.
2. Model Answer: The energy eigenvalues are given by E_n = (n^2 * h^2) / (8 * m * L^2).

### SECTION 4: Common Pitfalls & High-Frequency Exam Traps
Students often confuse phase velocity with group velocity in wave packets.

### SECTION 5: Active Recall Self-Testing Prompts
1. What is the physical significance of the wave function squared?
Answer: The probability density of finding the particle at a given spatial coordinate.
2. Why must energy be quantized in a bound state?
Answer: Because boundary conditions constrain the permitted de Broglie wavelengths.
`;

  it('correctly isolates Student Mock Exam Paper (Questions Only)', () => {
    const sections = extractExportSections(sampleCompositeStudyKit);

    expect(sections.examPaper).toBeDefined();
    expect(sections.examPaper).toContain('Define the Schrödinger equation');
    // Crucial check: ensures answers and rubrics are stripped from the student copy
    expect(sections.examPaper).not.toContain('Mark Allocation: 2 marks');
  });

  it('correctly isolates Official Marking Scheme & Rubrics', () => {
    const sections = extractExportSections(sampleCompositeStudyKit);

    expect(sections.markingScheme).toBeDefined();
    expect(sections.markingScheme).toContain('Mark Allocation: 2 marks');
    expect(sections.markingScheme).toContain('Model Answer');
  });

  it('extracts and formats Anki TSV Flashcard Deck', () => {
    const sections = extractExportSections(sampleCompositeStudyKit);

    expect(sections.ankiDeckText).toBeDefined();
    expect(sections.ankiCardCount).toBeGreaterThanOrEqual(2);
    expect(sections.ankiDeckText).toContain('#separator:tab');
    expect(sections.ankiDeckText).toContain('ScholarStudio');
    expect(sections.ankiDeckText).toContain('probability density');
  });

  it('extracts discrete numbered exam questions into a structured queue', () => {
    const sections = extractExportSections(sampleCompositeStudyKit);
    const questions = extractExamQuestions(sections.examPaper || '');

    expect(questions.length).toBe(2);
    expect(questions[0]).toContain('Define the Schrödinger equation');
    expect(questions[1]).toContain('potential well of width L');
  });

  it('compiles valid BibTeX (.bib) and APA 7th references from grounded papers and vault documents', () => {
    const samplePapers: ScholarlyPaper[] = [
      {
        id: 'paper-1',
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: 2017,
        doi: '10.5555/3295222.3295349',
        url: 'https://arxiv.org/abs/1706.03762',
        source: 'arxiv',
      },
    ];
    const sampleDocs: DocumentContext[] = [
      {
        id: 'doc-1',
        name: 'Quantum_Mechanics_Lecture_Notes.pdf',
        type: 'pdf',
        content: 'Hilbert space formalism...',
        sizeBytes: 1024,
        timestamp: 1736899200000,
      },
    ];

    const bib = generateBibTeX(samplePapers, sampleDocs);
    expect(bib).toContain('@misc{vaswani2017attention');
    expect(bib).toContain('title = {{Attention Is All You Need}}');
    expect(bib).toContain('author = {Ashish Vaswani and Noam Shazeer}');
    expect(bib).toContain('@misc{vaultquantummechanicslec');

    const apa = generateApaReferences(samplePapers, sampleDocs);
    expect(apa).toContain('Ashish Vaswani, Noam Shazeer (2017). Attention Is All You Need.');
    expect(apa).toContain('https://doi.org/10.5555/3295222.3295349');
  });

  it('extracts structured text from Word (.docx) document.xml payloads', () => {
    const sampleDocxXml = `
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Chapter 1: Stochastic Calculus</w:t></w:r></w:p>
          <w:p><w:r><w:t>Ito&apos;s Lemma &amp; Martingales</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `;

    const extracted = extractTextFromDocxXml(sampleDocxXml);
    expect(extracted).toContain('Chapter 1: Stochastic Calculus');
    expect(extracted).toContain("Ito's Lemma & Martingales");
  });

  it('transforms raw markdown into rich semantic HTML for print/PDF export', () => {
    const testMarkdown = `
# Quantum Superposition
This is a **critical** principle of *quantum mechanics*.

> Observation collapses the wave function.

| Concept | Formulation | Status |
| :--- | :--- | :--- |
| Wave Function | $\\Psi(x,t)$ | Validated |

- Superposition principle
- Entanglement

\`\`\`python
def calculate_psi():
    return 1.0
\`\`\`
`;

    const html = markdownToPrintHtml(testMarkdown);

    // Verifies conversion from markdown syntax to rich HTML elements
    expect(html).toContain('<h1>Quantum Superposition</h1>');
    expect(html).toContain('<strong>critical</strong>');
    expect(html).toContain('<em>quantum mechanics</em>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<table>');
    expect(html).toContain('>Concept</th>');
    expect(html).toContain('>Wave Function</td>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Superposition principle</li>');
    expect(html).toContain('<pre><code class="language-python">');
    expect(html).toContain('calculate_psi');
  });
});

