# ✨ FORGE v2.3 Beta

<<<<<<< HEAD
FORGE v2.3 Beta (`v2.3.0-beta.1`) turns the review's agent-runtime and workspace-data recommendations into concrete beta behavior: more precise tool capability disclosure, bounded evidence retrieval, explicit execution policy, and lifecycle-safe workspace data controls.
=======
FORGE 1.1.0-beta.1 makes long-running work belong to the workspace rather than an AI conversation. It also repairs editor creation/shortcuts, terminal CLI execution, workspace discovery recovery, GPT-5.6 tool routing, and keyless local-model tools. This beta is published as a GitHub Pre-release.
>>>>>>> 0d34973 (docs: record verified beta publication)

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

<<<<<<< HEAD
The beta is unsigned and not notarized. macOS Developer ID signing and trusted unattended replacement are not claimed.
=======
- Begins discovery at the workspace root instead of assuming a root-level `src` directory.
- Returns structured missing-path results with root-level recovery suggestions so an agent can continue searching after `ENOENT`.
- Routes GPT-5.6 tool-capable turns through OpenAI's Responses API while retaining provider-neutral internal messages and policy-controlled tool execution.
- Keeps direct non-tool provider requests supported.

## Terminal repairs

- Binds PTY sessions to the active workspace and rejects input for another workspace.
- Preserves the active xterm input callback instead of allowing renderer lifecycle changes to drop keyboard events.
- Rejects input after exit and creates a new writable PTY on Restart.
- Reconciles canonical macOS `/tmp` and `/private/tmp` workspace paths during restart.
- Supplies a bounded non-secret login environment with user identity and common Homebrew/user-local CLI paths.
- Uses readable active and inactive selection colors so selected terminal rows no longer appear as an opaque gray rendering block.
- Documents scoped Gatekeeper handling for separately installed signed CLIs instead of disabling macOS security.

## Local-model tools

- Allows keyless loopback OpenAI-compatible providers such as Ollama while continuing to require keys for remote hosts.
- Lists and validates local models, sends a focused policy-controlled file-tool catalog, and accepts compatible Chat Completions tool calls.
- Retries older compatible endpoints with `max_tokens` when they reject `max_completion_tokens`.

## Beta release and packaging policy

- Sets the authoritative identity to `1.1.0-beta.1`, tag `v1.1.0-beta.1`, and logical Beta channel.
- Migrates stored Preview preferences to Beta. Beta accepts only strictly newer `beta`, `rc`, or stable semantic versions; Stable accepts only strictly newer stable versions.
- Cleans `dist_electron` before standalone packaging and produces a hash-bearing `build-manifest.json`.
- Selects installation and upload artifacts from the manifest instead of wildcard-first-match logic.
- Uploads the universal DMG, ZIP, both blockmaps, and `beta-mac.yml` serially, with updater metadata last.

## Release status and limitations

The beta payload is verified at tag commit `8350aab8d498073b2335dfb8a1d7caa227865514`. ARM64 and universal packages, installed runtime behavior, the local-model file-tool round trip, and all five public universal asset hashes passed. The downloaded public ZIP was reinstalled at `/Applications/FORGE.app`; earlier app bundles were moved recoverably to Trash. Historical releases and tags remain intact.

No Apple Developer ID or notarization credentials are configured. The beta is ad-hoc signed/unsigned, Gatekeeper reports no usable signature, and the release cannot provide a trusted unattended macOS replacement chain.
>>>>>>> 0d34973 (docs: record verified beta publication)
