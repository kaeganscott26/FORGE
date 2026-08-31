# ✨ FORGE v2.5.0-beta test candidate

## 2.5.0-beta — Living intelligence

- Introduces the northern-lights FORGE identity across macOS, Windows, Linux, and FORGE-OS with a new application mark, distinct display/UI typography, animated glass surfaces, and a low-overhead Three.js aurora field.
- Visualizes the real AI layer instead of a decorative mock: context load, semantic records, FORGE memory, active tools, tasks, terminals, and index state are sampled through typed read-only IPC.
- Adds subtle opt-out system sounds, Browser/Explorer/Intelligence animated backgrounds, reduced-motion support, hidden-window animation suspension, and WebGL fallback behavior.
- Carries forward the repaired, off-by-default semantic embedding layer and adds a pre-allocation 32 MB direct file-read limit plus clearer permission errors.

This candidate has not been published. Packaging, native-platform acceptance, and user approval remain required before a public v2.5 release.

## 2.4.0-beta — Native semantic context

- Retains semantic embeddings as an optional, fresh-install-off discovery assistant with lazy routing, 8-result/4,000-token defaults, hard deduplication, current-file validation, Float32 vector storage, batched sql.js persistence, changed-path indexing, and local Ollama unload after each operation.
- Restores the authority of explicit Tool Results, current source, Git, and task/runtime evidence. Debugging cannot stop at `file.search`; explicit file/Git requests are enforced, and embedding failure injects nothing while Native FORGE and ToolRouter continue normally.
- Preserves Native FORGE and Hermes execution through the same FORGE-prepared context and ToolRouter; runtime capabilities are normalized across Linux, macOS, and Windows.

The prior entries below are historical release notes.

## 2.3.0-beta.2 — Hermes-ready autonomous runtime

- Adds cross-platform Hermes runtime detection, progressive skill discovery, and a safe Native FORGE fallback.
- Removes the FORGE tool-policy and approval gate from the execution path. Valid, available semantic tool calls execute through the shared router with centrally injected context, auditing, cancellation, rollback, validation, and loop protection intact.
- Replaces approval-state audit records with execution-state records and creates new workspace databases without approval tables or columns.
- Repairs shared browser-tab controls and terminal sizing behavior while preserving platform adapters.

The `v2.3.0-beta.1` material below is a historical release record. Current source is the unpublished `2.5.0-beta` candidate.

## 🧭 Predictable agent execution

- Advertises only tools that are available and enabled in the active FORGE runtime. Disabled web research, unavailable Browser, GitHub, terminal, task, and memory dependencies are no longer offered to a provider only to fail at execution time.
- Makes every registered tool declare an explicit side effect and approval policy. Git commits are now `repository-write` operations requiring a fresh explicit approval.
- Separates public network reads from network writes: enabled public web search/fetch are automatic and never transmit workspace content, while GitHub mutations and Git remote operations remain explicitly approved.
- Replaces the unstructured GitHub mutation payload with typed operation schemas for issues, comments, branches, files, pull requests, workflows, and releases.
- Requires an explicit shell network profile for known network-capable commands and reflects that profile in the approval/audit request. The profile is an accurate policy disclosure and command guard, not an OS-level network sandbox.

## 📚 Bounded workspace intelligence

- Adds cursor-style pagination to `file.list`, with stable ordering and a continuation offset.
- Adds bounded `file.read` ranges by line or character offset, including total size, returned range, truncation, and continuation metadata.
- Limits workspace-memory previews and writes, exposes record statistics, warns about oversized legacy records, and makes memory, conversation, and persistent-task deletion explicit about what is—and is not—removed.

## 🧪 Verification

The source gate covers typecheck, lint, storage persistence, memory retrieval, typed IPC, tool-policy runtime tests, shell policy tests, and production bundling. The tag workflow additionally validates the tagged source, universal package, updater metadata, serial asset upload, and public artifact hashes.

The beta is unsigned and not notarized. macOS Developer ID signing and trusted unattended replacement are not claimed.
