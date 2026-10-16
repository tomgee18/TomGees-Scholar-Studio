# 0001. Local-First Research Workspace Isolation and Portable Vault Snapshots

Date: 2026-10-16
Status: Accepted

## Context

Researchers using **TomGee's Scholar Studio** frequently work across multiple distinct inquiries—such as separate university courses, thesis chapters, or independent literature reviews. Previously, all uploaded [Context Vault](../../GLOSSARY.md#context-vault) documents, [Manuscript Canvas](../../GLOSSARY.md#manuscript-canvas) drafts, and [Scholar Copilot](../../GLOSSARY.md#scholar-copilot) conversations shared a single global namespace in browser storage (`IndexedDB`). When switching topics, researchers had to manually toggle `enabled` flags on every document or clear their vault entirely. Furthermore, because `IndexedDB` is bound to a single browser origin or Tauri WebView profile, researchers had no frictionless way to back up their entire scholarly state or migrate it between desktop and web environments without introducing a mandatory cloud database.

## Decision

1. Introduce **Research Workspaces** (`ResearchWorkspace`) as the top-level isolation boundary in `TomGeesScholarDB` (`version(6)`).
   - Every [Context Vault](../../GLOSSARY.md#context-vault) document (`DocumentContext`), draft (`DraftHistoryItem`), and [Scholar Copilot](../../GLOSSARY.md#scholar-copilot) thread (`ChatMessage`) is scoped to a `workspaceId` (defaulting to `'default'` for seamless backward compatibility with existing vaults).
   - Switching the active [Research Workspace](../../GLOSSARY.md#research-workspace) immediately scopes the active Context Vault, RAG semantic chunk retrieval, draft history, and Copilot thread without page reloads.
2. Introduce **Portable Vault Snapshots** (`.scholar.json` files) via `exportVaultSnapshot` and `importVaultSnapshot`.
   - A [Vault Snapshot](../../GLOSSARY.md#vault-snapshot) serializes all workspaces, documents, pre-computed semantic chunks (`DocumentChunk`), draft history, and chat threads into a versioned, human-inspectable JSON archive.
   - Restoring a snapshot merges or replaces records transactionally in `IndexedDB` and re-hydrates the in-memory `BM25Index`.

## Consequences

- **Positive:** Preserves 100% local-first privacy and zero-account onboarding while giving scholars multi-project organization and cross-device portability (Desktop Tauri <-> Web PWA).
- **Positive:** Legacy data created prior to schema `version(6)` automatically maps to the `'default'` Research Workspace without data loss or destructive migrations.
- **Negative / Trade-off:** Full Vault Snapshots containing large parsed PDFs and pre-chunked embeddings can produce multi-megabyte `.scholar.json` files; importing snapshots must run inside a single Dexie transaction to avoid partial hydration.
