# FORGE runtime consolidation implementation log — 2026-08-22

## OBSERVED

- Desktop platforms share the same TypeScript renderer/main runtime and package `apps/desktop/out/**/*`; the Explorer lazy-load, terminal fit/resize, and browser code paths are shared rather than separately implemented per operating system.
- The Explorer starts at the selected workspace root and lazily loads children through typed `file.list`; expansion is stateful in the renderer. Files are classified into text, binary, executable, image, audio, and video with metadata/preview behavior.
- The terminal already uses xterm's fit addon plus `ResizeObserver`, reports PTY dimensions through typed IPC, preserves bounded scrollback, and separates user terminal input from agent shell execution.
- The native agent runtime already centralizes context assembly, provider calls, semantic tool schemas, FORGE-owned execution context, task linkage, audit results, recovery, cancellation, and progress-loop protection.
- No ISO manifests, Arch package manifests, bootstrap scripts, or systemd/DBus configuration for FORGE-OS exist in this checkout. Bluetooth and power-service installation cannot be truthfully changed here.

## IMPLEMENTED

- **Autonomous tool execution migration:** replaced `@forge/tool-policy` with `@forge/tool-runtime`. The retained shared package contains only schemas, registry, request/result contracts, validation, and FORGE-owned execution context. `PolicyEngine`, session grants, approval metadata, pending approval states, approval IPC, native-runtime approval pauses, and Agent Actions approval controls were removed.
- Tool definitions no longer carry an approval classification. `ToolRouter.request` now validates/enriches a semantic request and executes it directly; audit records use execution states rather than authorization decisions.
- Task execution no longer projects or records approval decisions. New databases no longer create `task_approvals`; existing tables are not read or written. Schema v10 rebuilds legacy action history without `action_log.approval_decision` and removes `task_steps.approval_state`, while retaining the associated execution and task-step history.
- Agent Actions is now a live execution/history surface: requested, running, succeeded, failed, cancelled, audit details, task linkage, and cancellation remain available, while Allow/Deny/session controls and their IPC endpoints are gone.
- Added `@forge/agent-runtime`: Hermes CLI/endpoint detection, safe native fallback, and cross-platform progressive skill discovery.
- Added Settings and typed IPC for runtime preference/status and discovered skills. Hermes configuration rejects embedded URL credentials, non-loopback HTTP endpoints, and malformed command values.
- Replaced browser tab add/close Unicode controls with inline SVG icons, avoiding platform font fallback and encoding differences.
- Added focused regression coverage for unavailable Hermes fallback, detected CLI ownership messaging, progressive workspace/global skill discovery, and compatible `SKILL.md` frontmatter.
- Removed provider-authored task linkage from executable schemas. FORGE now injects task and step identity only through `ToolExecutionContext`; active task checkpoints and handoffs receive their task/audit identity internally.
- Added automatic durable-task continuation when an audited verified checkpoint advances to the next dependency-ready step. Failures, cancellation, and reconciliation states remain stop conditions.
- Replaced the browser tab add/close glyphs with inline SVG and made the add control create an actual blank native browser tab through typed IPC.
- Corrected terminal pane layout: the xterm host is always assigned the flexible grid row, including when no error banner is rendered; it now refits only after it has measurable dimensions and propagates the resulting PTY size.
- Hermes detection now derives candidate skill roots from a CLI-reported installation directory instead of relying solely on a platform path or `HERMES_HOME`.
- Added `docs/PLATFORM_RUNTIME_CONTRACT.md` to state the shared runtime/adapter boundary and the native validation that remains required.

## VERIFIED

- `npm run typecheck`: passed after the autonomous-execution migration.
- `npx vitest run packages/agent-runtime/test/index.test.ts apps/desktop/src/main/agent-continuation.test.ts apps/desktop/src/main/task-links.test.ts`: 3 files, 12 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- The local Windows Hermes CLI was found at `C:\Users\North\AppData\Local\hermes\hermes-agent\bin\hermes.exe`; its documented-compatible version flag is `--version`.

## PARTIALLY VERIFIED

- Windows source-level verification runs on Windows. Native packaged-app validation is intentionally deferred because the existing user-modified generated bundle `apps/desktop/out/main/index.js` must not be overwritten by a production build.
- macOS/Linux UI and packaged runtime execution require their native environments. Shared source paths and platform guards were inspected, but this Windows run is not a substitute for native runtime validation.

## BLOCKED

- Hermes ACP is present in the observed local installation, but it exposes Hermes-native filesystem/shell tools. A FORGE-owned ACP/MCP tool bridge that replaces those executors and streams events into Agent Actions has not yet been implemented; enabling Hermes as the active executor before that work would bypass the shared FORGE router, validation, context injection, auditing, and cancellation controls.
- FORGE-OS Bluetooth and power repair is blocked on the missing FORGE-OS build/ISO repository or manifests.
