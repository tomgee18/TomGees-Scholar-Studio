# TomGee's Scholar Studio

[![CI Quality Gate](https://github.com/tomgee18/TomGees-Scholar-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/tomgee18/TomGees-Scholar-Studio/actions/workflows/ci.yml)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.12-24C8D8?logo=tauri&logoColor=white)](https://tauri.app)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-5.0_Passing-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev)

A local-first, offline-capable academic research suite and study engine designed for graduate researchers, doctoral scholars, and high-stakes examination candidates. Built with **React 19**, **Vite**, **Dexie IndexedDB**, and packaged for native Windows desktop execution via **Tauri v2**.

---

## Key Capabilities

### 1. Collaborative Scholar Copilot (<kbd>Alt + C</kbd>)
- Collapsible right-hand drawer providing conversational assistance beside your draft.
- Real-time dual context awareness: reads your active draft and queries your Context Vault using BM25 relevance scoring.
- In-chat provider/model switcher (DeepSeek, Gemini, Groq, Ollama) with academic prompt chips (*"Critique Draft"*, *"Find Counterarguments"*, *"Check Sources"*).
- Direct 1-click actions on assistant responses: **Insert at Cursor**, **Append to Draft**, or **Copy Markdown**.

### 2. Socratic Interactive Exam Simulator
- In **Exam & Mastery Mode**, practice questions appear interactively below your generated paper.
- Submit typed answers for instant AI grading out of 100 with rubric critiques, score breakdowns, and diagnostic feedback.

### 3. Modular Scholar Export Hub
- **Student Mock Exam (Questions Only):** Automatically strips solutions and rubrics for closed-book, handwritten self-testing.
- **Official Marking Scheme & Rubrics:** Point-by-point allocation schemes and exemplar model answers for grading.
- **Anki & Quizlet TSV Deck (`#separator:tab`):** Direct 1-click import into Anki or Quizlet.
- **Examiner Evaluation Report:** Socratic examiner's mark out of 100, critiques, and remediation steps exported to PDF/MD/TXT.

### 4. Client-Side BM25 RAG & Token Efficiency
- Automatically splits documents into ~400-word chunks upon upload into IndexedDB.
- **Adaptive Injection:** Full text is injected when under 60% of context capacity; switches to top-15 BM25 ranked chunks on large corpuses or compact local models, cutting token usage by **80% to 90%**.

### 5. Universal AI Engine Hub
- Connects to any OpenAI-compatible API (`/v1/chat/completions`) with presets for **DeepSeek**, **Groq Cloud**, **OpenRouter**, **Ollama Local**, **LM Studio**, and **OpenAI**.
- Dedicated native **Google Gemini Direct SDK** (`@google/genai`) with live model discovery.
- Auto-detects keys from host system environment variables (`GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_HOST`).

### 6. In-App Reference Manual & Keybindings (<kbd>F1</kbd>)
- Dedicated tabbed help center modal covering quickstart, study modes, RAG engine, exports, and security.

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

- 📖 **[User Guide & Manual](docs/USER_GUIDE.md):** In-depth workflows, prompt engineering, study modes, and Anki import walkthrough.
- 🏛️ **[Technical Architecture](docs/ARCHITECTURE.md):** Tauri v2 IPC, BM25 RAG engine, database schemas, code-splitting, and security protocol.

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

Private / Personal Academic Suite — Created by TomGee.
