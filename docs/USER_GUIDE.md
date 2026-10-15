# TomGee's Scholar Studio — User Guide & Reference Manual

Welcome to **TomGee's Scholar Studio**, a local-first, offline-capable academic research suite and study engine designed for graduate researchers, doctoral scholars, and high-stakes examination candidates.

---

## Table of Contents
1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Setting Up API Credentials](#2-setting-up-api-credentials)
3. [The Context Vault & Document Ingestion](#3-the-context-vault--document-ingestion)
4. [The 4 Scholarly Engine Modes](#4-the-4-scholarly-engine-modes)
5. [Interactive Socratic Exam Simulator](#5-interactive-socratic-exam-simulator)
6. [Scholar Copilot Collaborative Chat & Agentic Skills Suite](#6-scholar-copilot-collaborative-chat--agentic-skills-suite)
7. [Live Open Scholarly Web Grounding](#7-live-open-scholarly-web-grounding)
8. [Modular Export Hub & Rich-Text PDF Printing](#8-modular-export-hub--rich-text-pdf-printing)
9. [Global Keyboard Shortcuts](#9-global-keyboard-shortcuts)
10. [Frequently Asked Questions & Troubleshooting](#10-frequently-asked-questions--troubleshooting)

---

## 1. Core Philosophy & Architecture
- **Zero-Leak Security:** Your research papers, theses, and documents are stored client-side in IndexedDB (`TomGeesScholarDB`). They are never uploaded to a third-party server or backend database.
- **Offline CSS & Assets:** 100% self-contained bundle with local Tailwind CSS and bundled PDF.js worker.
- **Universal Provider Choice:** Switch freely between Google Gemini Direct (Gemini 2.5 Flash / Pro), DeepSeek, Groq Cloud, OpenRouter, and local Ollama or LM Studio models.

---

## 2. Setting Up API Credentials
Scholar Studio does not require you to paste plaintext API keys into browser `localStorage`. Instead, it automatically reads your keys directly from your host operating system environment variables:

| Variable | Provider | Default Target |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini SDK | Direct Gemini 2.5 Flash / Pro endpoints |
| `DEEPSEEK_API_KEY` | DeepSeek AI | `https://api.deepseek.com/v1` |
| `GROQ_API_KEY` | Groq Cloud | `https://api.groq.com/openai/v1` |
| `OPENROUTER_API_KEY` | OpenRouter | `https://openrouter.ai/api/v1` |
| `OLLAMA_HOST` | Ollama Local | `http://localhost:11434` |

> **Tip:** You can verify your active keys anytime by clicking the **Settings** icon (gear in the top bar). Keys loaded from your environment will display a green `SYSTEM ENV` badge.

---

## 3. The Context Vault & Document Ingestion
The Context Vault (left sidebar) manages your reference library:
- **Supported Formats:** `.pdf` (with full PDF.js text extraction), `.txt`, `.md`, and source files.
- **Selective Grounding:** Use the toggle checkbox next to any document to include or exclude it from the active generation context without deleting it.
- **Vault Inspector:** Click the search magnifying glass next to any file to inspect the raw parsed text, word count, and extracted chunks.
- **BM25 Semantic Retrieval:** If your vault exceeds 60% of the active model's context window, the BM25 retrieval engine automatically selects the top-15 most relevant semantic chunks (~400 words each) matching your directive.

---

## 4. The 4 Scholarly Engine Modes

### A. Exam & Mastery Mode
Designed for doctoral qualifying exams, board examinations, and intensive university courses.
- **Output Structure:**
  1. *Core Conceptual Theorems & Axioms*
  2. *10 High-Yield Exam Questions* with complete Marking Rubrics
  3. *Diagnostic Traps & Counter-Intuitive Edge Cases*
  4. *Anki Flashcard Deck* (`Question ::: Answer`)
- **Interactive Integration:** Automatically boots the Socratic Quiz Panel directly beneath the generated study paper.

### B. Thesis & Dissertation Mode
Synthesizes graduate research following formal 5-chapter dissertation conventions:
- Literature background & problem statement
- Theoretical framework & methodological rationale
- Critical discursive synthesis with citation indicators
- Objective scholarly tone free of promotional or casual phrasing

### C. Literature Review & Meta-Synthesis Mode
Extracts cross-paper themes across your uploaded vault:
- Compiles a comparative thematic matrix
- Surfaces points of scholarly consensus vs methodological tensions
- Explicitly highlights unaddressed research gaps for future publication

### D. Custom Scholar Mode
Freeform academic prompting strictly grounded in your active Context Vault documents with structured Markdown, LaTeX math equations, and tables.

---

## 5. Interactive Socratic Exam Simulator
When running in **Exam & Mastery Mode**, the interactive Socratic Grading Panel appears directly beneath your study paper:
1. Review the generated practice questions.
2. Type or paste your answers into the candidate response box.
3. Click **Submit Answers for Socratic Grading**.
4. The AI Examiner evaluates your submission against the rubric, generating:
   - **Score out of 100**
   - **Diagnostic Breakdown** (Conceptual strengths vs misconceptions)
   - **Examiner's Formal Report** (Ready for export in the Export Hub)

---

## 6. Scholar Copilot Collaborative Chat & Agentic Skills Suite
Open the Copilot sidebar by pressing <kbd>Alt + C</kbd> or clicking the **Copilot** button in the header bar.
- **Triple Context Awareness:** Toggle the active draft, your document vault RAG, and live scholarly web retrieval concurrently.
- **Agentic Academic Skills Palette:**
  - `📚 Lit Discovery`: Searches arXiv, Crossref, and Semantic Scholar for seminal papers, theoretical foundations, and research gaps.
  - `🔍 Ground Citations`: Scans claims and locates verified studies with authentic DOIs.
  - `🛡️ Counterarguments`: Uncovers dissenting empirical literature and critiques to fortify thesis defense.
  - `⚙️ Methodology Audit`: Catalogs established empirical designs, statistical frameworks, and benchmark datasets.
- **In-Chat Model Switcher:** Switch models (e.g. from DeepSeek to Gemini or Groq) in real-time.
- **Direct Editor Actions:**
  - `Insert at Cursor`: Pastes assistant response directly into the editor.
  - `Append to Draft`: Appends text to the end of the document.
  - `Copy`: Copies formatted Markdown.

---

## 7. Live Open Scholarly Web Grounding
Scholar Studio features a zero-API-key open academic retrieval pipeline:
- **Zero Third-Party Cost or Keys:** Directly queries **Crossref REST API** (peer-reviewed journal DOIs), **arXiv API** (STEM & preprint repositories), and **Semantic Scholar** without requiring commercial search API keys.
- **Authentic DOI Verification:** Completely prevents hallucinated citations by grounding drafts in verified publication records.
- **1-Click Save to Vault:** Any retrieved academic paper can be saved directly to your Context Library Vault with 1 click, automatically parsing its abstract, authors, and DOI for subsequent local BM25 RAG retrieval.
- **Full Offline Protection:** Toggle the "Scholarly Web Grounding" switch OFF at any time to guarantee 100% offline local processing strictly from your Context Vault.

---

## 8. Modular Export Hub & Rich-Text PDF Printing
Click **Export Hub** in the top bar to extract targeted deliverables:

1. **Rich-Text Academic PDF:** Converts Markdown to semantic HTML typography (formal serif font, styled tables, code callouts, institutional header) and triggers the native Windows Print/PDF dialog without popup blockers.
2. **Student Mock Exam (Questions Only):** Generates a clean question paper with ruled answer spaces, completely removing solutions and rubrics for self-testing.
3. **Marking Scheme & Rubrics:** Isolates model solutions, key points, and grading weights for post-exam review.
4. **Anki Flashcard TSV Deck (`#separator:tab`):** Formats flashcards for direct import into Anki:
   - Open Anki → File → Import → select `.txt` / `.tsv` file.
   - Field 1 maps to Front, Field 2 maps to Back, Field 3 to Tags.
5. **Examiner Diagnostic Report:** Exports Socratic grade breakdowns and examiner evaluations to PDF, Markdown, or text.

---

## 9. Global Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>F1</kbd> | Toggle Help Reference Manual | Global |
| <kbd>Alt + C</kbd> | Toggle Scholar Copilot Drawer | Global |
| <kbd>Ctrl + Enter</kbd> / <kbd>Cmd + Enter</kbd> | Trigger Draft Generation | Prompt Box |
| <kbd>Esc</kbd> | Dismiss any open modal / drawer | Modals |
| <kbd>Enter</kbd> | Send message | Copilot Input |
| <kbd>Shift + Enter</kbd> | Multi-line line break | Copilot Input |

---

## 10. Frequently Asked Questions & Troubleshooting

### Why am I seeing an API Key error?
Ensure your environment variable is set on your host machine (e.g., `setx GEMINI_API_KEY "your_key"` on Windows, or in `.env`). In desktop mode, restart the app to allow the native Rust process to read updated environment variables.

### How does the app handle large 500-page textbooks?
Scholar Studio splits large files into ~400-word chunks. The BM25 algorithm dynamically scales chunk retrieval based on your model's ceiling (e.g., 40 chunks on Gemini 1M, 25 chunks on DeepSeek 64k), avoiding context window budget overflows.

### Can I run local offline models?
Yes. Install [Ollama](https://ollama.ai) or [LM Studio](https://lmstudio.ai), launch your local model (e.g., `ollama run llama3`), and select the **Ollama Local** profile in Settings. Toggling Scholarly Web Grounding OFF enables a completely air-gapped study experience.
