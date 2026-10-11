import { describe, it, expect } from 'vitest';
import { extractExportSections, markdownToPrintHtml } from './exportParser';

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
