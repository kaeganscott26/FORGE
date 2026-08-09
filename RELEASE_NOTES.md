# ✨ FORGE v2.3 Beta

FORGE v2.3 Beta (`v2.3.0-beta.1`) turns the review's agent-runtime and workspace-data recommendations into concrete beta behavior: more precise tool capability disclosure, bounded evidence retrieval, explicit execution policy, and lifecycle-safe workspace data controls.

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
