# TomGee's Scholar Studio v1.0.0 — Official Launch 🎓

Welcome to the initial public release of **TomGee's Scholar Studio**, a local-first, offline-capable academic research suite and study engine designed for graduate researchers, doctoral scholars, and high-stakes examination candidates. Built with **React 19**, **Vite**, **Dexie IndexedDB**, and packaged for native Windows desktop execution via **Tauri v2**.

---

### ✨ Key Features

- **Collaborative Scholar Copilot (`Alt + C`):** Dual-context conversational AI assistant that reads both your active draft and queries your Context Vault using BM25 relevance scoring. Direct 1-click actions to insert at cursor, append to draft, or copy markdown.
- **Socratic Interactive Exam Simulator:** Interactive mock examination interface with real-time AI grading, rubric critiques, and diagnostic feedback out of 100.
- **Modular Scholar Export Hub:** Export full documents, student question papers, marking rubrics, Anki/Quizlet flashcard decks (`#separator:tab`), and examiner reports to PDF (clean rich-text print), Markdown, and TXT.
- **Universal AI Engine Hub:** Seamless integration with Google Gemini Direct SDK (`@google/genai`) and any OpenAI-compatible router/endpoint (DeepSeek, Groq Cloud, OpenRouter, Ollama Local, LM Studio, OpenAI).
- **Strict Evidentiary Grounding:** Deterministic mode (0.15 temperature + anti-extrapolation directives) that forces open models to stay bounded to indexed vault sources or explicitly state `[Source Gap]`.
- **Dynamic Context Window Management:** Safe token headroom reservation (~2,048 tokens reserved on 8k models) preventing `400: context length exceeded` errors.
- **Resilient Desktop Security & Safety:** Top-level React Error Boundary with instant diagnostic copy for GitHub issue reporting, strict Content Security Policy (CSP), and local Dexie IndexedDB storage.

---

### 📦 Installation for Windows (FOSS)

Download one of the attached packages:
- **`TomGees-Scholar-Studio_1.0.0_x64-setup.exe`** — Standard Windows Setup Installer
- **`TomGees-Scholar-Studio_1.0.0_x64_en-US.msi`** — Enterprise Windows Installer

> **Note on Windows SmartScreen:**
> Because this is a community Free and Open Source Software (FOSS) release without commercial corporate certificate signing, Windows Defender SmartScreen may display: *"Windows protected your PC — Unknown Publisher"*.
> Click **"More info"** and then select **"Run anyway"**. You can verify the integrity of the binary against the official SHA-256 release checksums below.

---

### 🔒 Cryptographic Checksums (SHA-256)

```text
e2e3e8dbfbb5af03b287af23fd77397fa576e9e50419375540634d0c3d041411  TomGees-Scholar-Studio_1.0.0_x64-setup.exe
9a0c5c1e4e55741deba81dbca742539db843f6f3c09b71057f94ce41044a8dce  TomGees-Scholar-Studio_1.0.0_x64_en-US.msi
```

---

**Full Changelog**: https://github.com/tomgee18/TomGees-Scholar-Studio/commits/v1.0.0
