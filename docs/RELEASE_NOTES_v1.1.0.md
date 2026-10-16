# TomGee's Scholar Studio v1.1.0 — Architectural Elevation Release 🎓✨

**TomGee's Scholar Studio v1.1.0** introduces five major architectural pillars that transform the studio into a complete, multi-workspace academic authoring, examination defense, and bibliography compilation environment.

---

### 🚀 What's New in v1.1.0

1. **Dual-Mode Manuscript Canvas & Inline Selection Toolbar**
   - Switch seamlessly between **Preview**, **Edit Canvas** (cursor-tracked Markdown source), and **Split Studio** (side-by-side live scholarly preview).
   - **True Cursor Insertion:** Place your cursor anywhere in the Manuscript Canvas and click **Insert at Cursor** inside Scholar Copilot to weave paragraphs directly in-place.
   - **Inline Selection Action Bar:** Highlight any claim or paragraph to trigger 1-click AI transformations grounded in your Context Vault: **Cite Claim**, **Expand with Vault**, **Academic Polish**, or **Ask Copilot**.

2. **Multi-Question Examination Session & 1-Turn Viva Voce Probe**
   - Automatically parses generated mock examinations into an interactive **Question Queue (`Q1`..`QN` + `+ Custom`)**.
   - Tracks per-question score badges (`XX/100`) and computes your real-time **Session Mastery** average.
   - **1-Turn Viva Voce Oral Defense:** After receiving your initial rubric evaluation, launch a targeted **Viva Voce Follow-Up Probe** to defend your reasoning against an oral examiner challenge.

3. **Interactive Citation Provenance & BibTeX (`.bib`) / APA 7th Compiler**
   - Inline `[Source: Document Name]` and `(Source: ...)` markers in rendered output are now clickable citation badges that open the **Document Inspector Modal** pre-filtered to the cited primary source.
   - Export verified **BibTeX (`.bib`)** files (ready for Overleaf, LaTeX, and Zotero) or formatted **APA 7th Reference Lists** directly from the **Modular Export Hub**.

4. **Isolated Research Workspaces & Portable Vault Snapshots (`.scholar.json`)**
   - Organize separate courses, qualifying exams, or dissertation chapters into isolated **Research Workspaces** (Dexie IndexedDB `version(6)`).
   - Export and restore complete **Vault Snapshots (`.scholar.json`)** containing workspace metadata, documents, semantic BM25 chunks, draft history, and Copilot threads.

5. **Native Word (`.docx`) Ingestion & Copilot Grounded Paper Cards**
   - Drag and drop `.docx` manuscripts and syllabi directly into the Context Vault — parsed client-side via Web `DataView` ZIP Central Directory traversal and `DecompressionStream('deflate-raw')` with zero external dependencies.
   - **Scholar Copilot (`Alt + C`)** now renders interactive **Grounded Paper Cards** inside chat responses with 1-click **Save to Vault** and structured `AcademicSkillType` prompt templates.

6. **Hierarchical Academic Chunker, Contextual Breadcrumbs & Stratified Multi-Doc BM25F+MMR**
   - **Zero Document Starvation:** Always injects a complete **Vault Inventory Manifest** and guarantees **Stratified Per-Document Coverage** across all uploaded files (10 uploaded past questions = all 10 files are guaranteed representation), plus automatic 100% Full-Vault injection whenever the Vault fits within 75% of the model's context window.
   - **Structure-Preserving Academic Chunker:** Keeps exam questions (`Question 1`, `Q1.`), sub-parts `(a)/(b)`, Markdown tables, and LaTeX blocks intact and prepends `[Document | Section | Part X/Y]` contextual breadcrumbs to every chunk.
   - **BM25F + Stemming + Bigrams + MMR:** Boosts filename matches (`3.5x`) and section headings (`2.5x`), normalizes academic inflections (`questions` ↔ `question`, `matrices` ↔ `matrix`), rewards multi-word phrases (`2.0x`), and eliminates redundant chunks via Maximal Marginal Relevance (MMR).

---

### 🛠️ Engineering & CI Improvements
- Upgraded CI/CD pipelines to Node.js 22 and configured `pool: 'threads'` in Vitest for deterministic cross-platform test execution.
- Added canonical domain glossary ([`GLOSSARY.md`](https://github.com/tomgee18/TomGees-Scholar-Studio/blob/main/GLOSSARY.md)) and [`ADR 0001`](https://github.com/tomgee18/TomGees-Scholar-Studio/blob/main/docs/adr/0001-local-first-workspace-isolation-and-snapshots.md).

---

### 📦 Installation for Windows (FOSS)

Download one of the attached installer packages below:
- **`TomGees-Scholar-Studio_1.1.0_x64-setup.exe`** — Standard Windows NSIS Setup Installer
- **`TomGees-Scholar-Studio_1.1.0_x64_en-US.msi`** — Enterprise Windows MSI Package
- **`SHA256SUMS.txt`** — Official cryptographic SHA-256 checksums

> **Note on Windows SmartScreen:**
> Because this is a community Free and Open Source Software (FOSS) release without commercial corporate certificate signing, Windows Defender SmartScreen may display: *"Windows protected your PC — Unknown Publisher"*.
> Click **"More info"** and then select **"Run anyway"**. You can verify binary integrity against `SHA256SUMS.txt`.

---

**Full Changelog**: https://github.com/tomgee18/TomGees-Scholar-Studio/compare/v1.0.0...v1.1.0
