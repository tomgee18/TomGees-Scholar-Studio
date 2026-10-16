# Changelog

All notable changes to **TomGee's Scholar Studio** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-16

### Added
- **Dual-Mode Manuscript Canvas & Selection Action Bar:**
  - Switch between **Preview**, **Edit Canvas** (direct Markdown editing), and **Split Studio** (side-by-side live rendering).
  - Cursor-offset tracking (`selectionStart`/`selectionEnd`) so Scholar Copilot's **Insert at Cursor** weaves paragraphs directly at the active cursor position.
  - Inline AI Selection Action Bar when highlighting text: **Cite Claim**, **Expand with Vault**, **Academic Polish**, and **Ask Copilot**.
- **Multi-Question Examination Session & 1-Turn Viva Voce Probe:**
  - Automatically parses numbered exam questions into an interactive Question Queue (`Q1`..`QN` + `+ Custom`) with per-question score badges (`XX/100`) and a live **Session Mastery** average bar.
  - Added a 1-turn **Viva Voce Follow-Up Probe** oral defense challenge and evaluator after initial grading.
- **Interactive Citation Provenance & BibTeX (`.bib`) / APA 7th Compiler:**
  - Inline `[Source: ...]` and `(Source: ...)` markers in rendered output are now interactive citation badges that open the Vault Document Inspector pre-filtered to the cited document.
  - Added a **BibTeX (`.bib`) & APA 7th Reference Compiler** card in the Export Hub to export grounded papers and primary Context Vault sources directly for LaTeX/Overleaf/Zotero.
- **Research Workspaces & Portable Vault Snapshots (`.scholar.json`):**
  - Upgraded Dexie IndexedDB to `version(6)` with a `workspaces` table and `workspaceId` scoping across documents, draft history, and Copilot chat threads.
  - Added a **Research Workspace Switcher** (create, switch, and delete isolated project workspaces) and 1-click **Backup / Restore Vault Snapshot (`.scholar.json`)** in the left sidebar.
- **Zero-Dependency Word (`.docx`) Ingestion & Copilot Paper Cards:**
  - Client-side `.docx` parser using Web `DataView` ZIP Central Directory traversal and `DecompressionStream('deflate-raw')` to extract `word/document.xml` paragraphs with zero external dependencies.
  - Structured `AcademicSkillType` prompt routing and interactive **Grounded Paper Cards** inside Scholar Copilot chat messages with 1-click **Save to Vault**.
- **Domain Model & Architecture Documentation:**
  - Added canonical domain glossary (`GLOSSARY.md`) and ADR 0001 (`docs/adr/0001-local-first-workspace-isolation-and-snapshots.md`).

### Fixed
- **CI Quality Gate Node & Vitest Pool Compatibility:** Upgraded GitHub Actions workflow to Node.js 22 and configured `pool: 'threads'` in `vitest.config.ts` to eliminate `jsdom`/`webidl-conversions` worker isolation crashes.

---

## [1.0.0] - 2026-10-15

### Added
- Initial public release of **TomGee's Scholar Studio** (Web & Tauri v2 Windows Desktop).
- **4 Scholarly Engine Modes:** Exam & Mastery, Thesis & Dissertation, Literature Review & Meta-Synthesis, and Custom Scholar Mode.
- **Collaborative Scholar Copilot (`Alt + C`):** Multi-thread conversational assistant with BM25 RAG and Open Scholarly Web Grounding (Crossref, arXiv, Semantic Scholar).
- **Socratic Interactive Exam Simulator:** Automated rubric evaluation and grading out of 100.
- **Modular Export Hub:** Rich-text Academic PDF printing, Student Mock Exam (Questions Only), Marking Scheme & Rubrics, Anki TSV Flashcards (`#separator:tab`), and Examiner Reports.
- **Universal AI Engine Hub:** Native Google Gemini Direct SDK (`@google/genai`) and OpenAI-compatible router (DeepSeek, Groq, OpenRouter, Ollama Local, LM Studio) with host OS environment variable auto-detection.
