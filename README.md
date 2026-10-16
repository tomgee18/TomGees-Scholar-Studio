# TomGee's Scholar Studio

[![CI Quality Gate](https://github.com/tomgee18/TomGees-Scholar-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/tomgee18/TomGees-Scholar-Studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Wiki](https://img.shields.io/badge/Wiki-Documentation-blue.svg)](https://github.com/tomgee18/TomGees-Scholar-Studio/wiki)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.12-24C8D8?logo=tauri&logoColor=white)](https://tauri.app)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-5.0_Passing-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev)

A local-first, offline-capable academic research suite and study engine designed for graduate researchers, doctoral scholars, and high-stakes examination candidates. Built with **React 19**, **Vite**, **Dexie IndexedDB**, and packaged for native Windows desktop execution via **Tauri v2**.

---

## Key Capabilities (v1.1.0)

### 1. Dual-Mode Manuscript Canvas & Selection Toolbar
- Switch seamlessly between **Preview**, **Edit Canvas** (cursor-aware Markdown editor), and **Split Studio** (side-by-side live rendering).
- **Inline Selection Action Bar:** Highlight any passage to run 1-click AI transformations grounded in your Vault: **Cite Claim**, **Expand with Vault**, **Academic Polish**, or **Ask Copilot**.
- **Interactive Citation Provenance:** Click any inline `[Source: ...]` or `(Source: ...)` badge in rendered output to open the **Document Inspector Modal** pre-filtered to the cited primary source.

### 2. Multi-Question Examination Session & 1-Turn Viva Voce Probe
- In **Exam & Mastery Mode**, generated mock exams automatically populate an interactive **Question Queue (`Q1`..`QN` + `+ Custom`)**.
- Track per-question score badges (`XX/100`) and real-time **Session Mastery** averages.
- **1-Turn Viva Voce Follow-Up Probe:** Defend your reasoning against a targeted oral examiner follow-up challenge after initial grading.

### 3. Research Workspaces, `.docx` Ingestion, & Portable Vault Snapshots
- Organize separate courses, qualifying exams, or dissertation chapters into isolated **Research Workspaces** (Dexie IndexedDB `version(6)`).
- **Zero-Dependency `.docx` Ingestion:** Drag and drop `.pdf`, `.docx`, `.md`, and `.txt` files directly into the Context Vault.
- **Portable Vault Snapshots (`.scholar.json`):** Export and restore complete workspace backups (documents, BM25 chunks, draft history, and Copilot threads) in 1 click.

### 4. Collaborative Scholar Copilot (<kbd>Alt + C</kbd>) & Grounded Paper Cards
- Collapsible right-hand drawer with triple context awareness: active draft, Context Vault BM25 RAG, and live Open Scholarly Web Grounding (Crossref, arXiv, Semantic Scholar).
- Structured **Academic Skills** (*Lit Discovery*, *Ground Citations*, *Counterarguments*, *Methodology Audit*) and interactive **Grounded Paper Cards** inside chat messages with 1-click **Save to Vault**.
- Cursor-tracked **Insert at Cursor**, **Append to Draft**, or **Copy Markdown**.

### 5. Modular Scholar Export Hub & BibTeX (`.bib`) Compiler
- **BibTeX (`.bib`) & APA 7th Reference Compiler:** Export verified BibTeX entries (for LaTeX, Overleaf, and Zotero) or formatted APA 7th reference lists from grounded papers and Vault documents.
- **Student Mock Exam (Questions Only):** Automatically strips solutions and rubrics for closed-book self-testing.
- **Official Marking Scheme & Rubrics:** Point-by-point allocation schemes and exemplar model answers.
- **Anki & Quizlet TSV Deck (`#separator:tab`):** Direct 1-click import into Anki or Quizlet.
- **Examiner Evaluation Report:** Socratic examiner's mark out of 100, critiques, and Viva Voce defense transcript exported to PDF/MD/TXT.

### 6. Universal AI Engine Hub & Strict Evidentiary Grounding
- Connects to any OpenAI-compatible API (`/v1/chat/completions`) with presets for **DeepSeek**, **Groq Cloud**, **OpenRouter**, **Ollama Local**, **LM Studio**, and **OpenAI**, plus native **Google Gemini Direct SDK** (`@google/genai`).
- **Strict Evidentiary Grounding:** Anti-hallucination mode locking generation to verified Vault citations (`0.15` temperature).
- Auto-detects keys from host system environment variables (`GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_HOST`).

---

## Global Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>F1</kbd> | Toggle Help Reference Manual | Global |
| <kbd>Alt + C</kbd> | Toggle Scholar Copilot Drawer | Global |
| <kbd>Ctrl + Enter</kbd> / <kbd>Cmd + Enter</kbd> | Trigger Draft Generation | Directive Prompt |
| <kbd>Esc</kbd> | Dismiss any open modal / drawer | Modals |
| <kbd>Enter</kbd> | Send message in Copilot | Copilot Input |
| <kbd>Shift + Enter</kbd> | Line break in Copilot | Copilot Input |

---

## Documentation Links

- 📚 **[GitHub Project Wiki](https://github.com/tomgee18/TomGees-Scholar-Studio/wiki):** Web-accessible knowledge base automatically synced with official guides and architecture specs.
- 📖 **[User Guide & Manual](docs/USER_GUIDE.md):** In-depth workflows, Research Workspaces, Dual-Mode Canvas, Viva Voce defense, and BibTeX/Anki export walkthroughs.
- 🏛️ **[Technical Architecture](docs/ARCHITECTURE.md):** Tauri v2 IPC, BM25 RAG engine, Dexie v6 workspace schema, client-side `.docx` parser, and security protocol.
- 🗂️ **[Domain Glossary](GLOSSARY.md) & [ADR 0001](docs/adr/0001-local-first-workspace-isolation-and-snapshots.md):** Canonical ubiquitous language and architectural decision records.
- 📋 **[Changelog](CHANGELOG.md):** Full release history (`v1.1.0`, `v1.0.0`).

---

## Quickstart

### Prerequisites
- Node.js (v20+ recommended)
- Rust toolchain (`rustup` / `cargo`) for desktop builds

### 1. Web Development
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### 2. Desktop Development (Tauri v2)
```bash
# Run native desktop app with live reload
npm run tauri:dev

# Build production standalone desktop executable (.exe)
npm run tauri:build
```

### 3. Quality & Verification Gates
```bash
# Run unit tests
npm test

# Run TypeScript typecheck
npm run typecheck

# Run ESLint analysis
npm run lint

# Build production web bundle
npm run build
```

---

## Windows Desktop Installation (FOSS)

Pre-compiled standalone installers for Windows x64 are available in the [Releases](https://github.com/tomgee18/TomGees-Scholar-Studio/releases) section:

- **NSIS Setup Installer:** `TomGees-Scholar-Studio_1.0.0_x64-setup.exe` (~1.87 MB)
- **MSI Enterprise Package:** `TomGees-Scholar-Studio_1.0.0_x64_en-US.msi` (~2.36 MB)

> [!NOTE]
> **Windows SmartScreen Notice:**
> Because this is a community Free and Open Source Software (FOSS) release without commercial corporate certificate signing, Windows Defender SmartScreen may display: *"Windows protected your PC — Unknown Publisher"*.
> Click **"More info"** and then select **"Run anyway"**. You can verify the integrity of the binary against the official SHA-256 release checksums below.

### Release Checksums (v1.0.0)

| File | Size | SHA-256 Checksum |
| :--- | :--- | :--- |
| `TomGees-Scholar-Studio_1.0.0_x64-setup.exe` | 1.87 MB | `95f3d0a2b1227c57e7b65cd93063e9e2db86c4b62173ce0b089fbf271d5e74aa` |
| `TomGees-Scholar-Studio_1.0.0_x64_en-US.msi` | 2.36 MB | `2d8d57d0a92a92339506eaeee455eb8e01c07275b1645a52c11137ad0cc64dea` |

---

## Environment Variables

Scholar Studio reads keys automatically from your operating system environment without storing them in browser `localStorage`:

```bash
# Google Gemini SDK
GEMINI_API_KEY=your_gemini_key

# DeepSeek Cloud
DEEPSEEK_API_KEY=your_deepseek_key

# Groq Cloud
GROQ_API_KEY=your_groq_key

# OpenRouter Multi-Model
OPENROUTER_API_KEY=your_openrouter_key

# Ollama Local Daemon
OLLAMA_HOST=http://localhost:11434
```

---

## License

This project is open-source and released under the [MIT License](LICENSE) — free for academic, personal, and educational use. Developed by **TomGee**.
