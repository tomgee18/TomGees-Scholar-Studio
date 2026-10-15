# Contributing to TomGee's Scholar Studio

Thank you for your interest in contributing to **TomGee's Scholar Studio**! This project is an open-source, local-first academic research suite designed for researchers, doctoral candidates, and students.

---

## Development Setup

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Rust toolchain**: `rustup` with the stable channel (required for Tauri desktop development)

### 1. Clone & Install
```bash
git clone https://github.com/tomgee18/TomGees-Scholar-Studio.git
cd TomGees-Scholar-Studio
npm install
```

### 2. Web Development (Fast Iteration)
```bash
npm run dev
```
Launches the Vite development server with Hot Module Reloading (HMR) at `http://localhost:3000`.

### 3. Native Desktop Development (Tauri v2)
```bash
npm run tauri:dev
```
Launches the native desktop window connected to Vite live reload.

---

## Code Quality & Verification Gates

Before submitting any Pull Request, ensure that all quality gates pass:

```bash
# 1. Automated unit test suite (Vitest)
npm test

# 2. TypeScript strict typechecking
npm run typecheck

# 3. ESLint static analysis
npm run lint

# 4. Production web bundle compilation
npm run build
```

---

## Architecture Guidelines

- **Zero Hallucination / Strict Grounding:** Any modifications to the retrieval or prompt synthesis pipeline in `lib/ai/` must strictly respect context window limits and preserve the `strictGrounding` anti-extrapolation constraints.
- **Offline-First Persistence:** User data, documents, and settings are stored locally in IndexedDB (`Dexie`) with synchronous `localStorage` fallback. Never introduce external cloud dependencies for local indexing.
- **Desktop Security:** Always maintain strict Content Security Policy (CSP) guidelines in `src-tauri/tauri.conf.json`.

---

## Submitting a Pull Request

1. Fork the repository and create your feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Write clean, readable code and add unit tests for new logic.
3. Ensure `npm test`, `npm run typecheck`, and `npm run lint` all pass.
4. Commit your changes using conventional commits:
   ```bash
   git commit -m "feat(module): describe your feature"
   ```
5. Push to your fork and submit a Pull Request to `main`.
