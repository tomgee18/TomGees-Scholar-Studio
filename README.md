# TomGees-Scholar-Studio

A production-grade, context-aware academic research and exam mastery engine with a **Liquid Glass** UI.

## Modular Scholar Export Hub

Click the **Export Hub** button on any generation run to export individual components independently or combined:
- **Complete Study Suite**: PDF print-ready, Markdown (.md), and Plain Text (.txt).
- **Student Mock Exam Paper (Questions Only)**: Automatically strips solutions and grading rubrics so you can print a clean paper to take by hand under closed-book exam conditions.
- **Official Marking Scheme & Rubrics**: Exports the point-by-point allocation scheme and exemplar model answers for post-exam self-grading.
- **Anki & Quizlet Flashcard Deck**: Automatically converts generated active recall questions into standard tab-delimited Anki decks (`#separator:tab`) for 1-click import into Anki / Quizlet.
- **Examiner Evaluation Report**: Exports the Socratic examiner's mark out of 100, critiques, and model revisions.

## Token-Efficient Document Intelligence (RAG & BM25)

- **Semantic Chunker**: Automatically chunks uploaded materials into ~400-word sections with 50-word overlaps upon ingestion into IndexedDB.
- **Zero-Dependency BM25 Relevance Retrieval**: Scores and ranks document sections against the user's research directive using BM25 frequency and length-normalization algorithms.
- **Adaptive Injection Engine**:
  - Automatically sends **100% Full Text** when context fits comfortably (< 60% of model window).
  - Automatically switches to **Smart BM25 Retrieval** (Top-15 relevant excerpts) when documents exceed the context budget or when using constrained local models (Ollama 8k), reducing token usage by **80% to 90%**.
  - Includes a manual UI toggle to force Smart Retrieval at any time.

## 4-Pillar Scholarly Suite

1. **Exam & Mastery Mode**:
   - High-yield theorem & concept mapping.
   - Master mock exam papers (Part A conceptual, Part B applied, Part C comprehensive essays).
   - Official point-by-point marking schemes & exemplar answers.
   - High-frequency exam traps & common student pitfalls table.
   - **Socratic Interactive Exam Simulator**: Take generated exam questions interactively, submit answers, and receive instant AI examiner grading with scores out of 100 and rubric feedback.
2. **Thesis & Dissertation Mode**:
   - Formal 5-chapter research framework (Introduction, Literature Review, Methodology, Results, Conclusion).
3. **Literature Review & Meta-Synthesis Mode**:
   - Thematic comparison matrix across all uploaded papers.
   - Critical methodological critiques, points of scholarly consensus vs. empirical contradictions, and research gap identification.
4. **Custom Scholar Mode**:
   - Context-anchored freeform instructions.

## Smart Vault Inspector & Selective Inclusion

- **Document Inspector**: Click the eye icon next to any uploaded PDF/document in the sidebar to read the full extracted text in a clean modal, check exact token counts, and search document contents.
- **Selective Context Toggle**: Check/uncheck documents to selectively include or exclude specific files from individual generation runs without deleting them from IndexedDB.

## Universal AI Engine

- Connects to **any standard OpenAI-compatible API** (`/v1/chat/completions`) with built-in presets for **DeepSeek**, **Groq Cloud**, **OpenRouter**, **Ollama Local**, **LM Studio**, and **OpenAI**.
- Dedicated native **Google Gemini Direct SDK** (`@google/genai`).
- Auto-detects keys from system environment variables (`DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`).

## Getting Started

### Prerequisites

Node.js (v18+)

### Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Run test suite:
   ```bash
   npx vitest run
   ```
4. Build for production:
   ```bash
   npm run build
   ```
