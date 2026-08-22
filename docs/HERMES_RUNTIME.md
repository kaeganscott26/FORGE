# Hermes Runtime Integration

## Ownership

FORGE remains authoritative for the active workspace, `.forge/metadata.sqlite`, durable memory, conversations, tasks, tool execution, audit records, rollback data, and renderer state. Hermes is optional runtime infrastructure: it can provide skills, MCP orchestration, planning, and model-facing behavior only through a FORGE-owned adapter.

## Current implementation

**IMPLEMENTED**

- `@forge/agent-runtime` provides provider-neutral runtime profile types, cross-platform Hermes CLI detection, optional endpoint reachability checks, and native fallback selection.
- Settings persist a requested runtime, optional Hermes command, and optional HTTPS-or-loopback endpoint without storing a credential in the workspace.
- Typed IPC exposes runtime status and progressive skill metadata discovery.
- Skills are discovered from `.forge/skills`, repository `skills`, configured Hermes roots, and `/usr/share/forge/skills` only on Linux. FORGE indexes frontmatter metadata; it does not inject every skill body into every model turn.

**PARTIALLY IMPLEMENTED**

Hermes v0.20.5 was observed exposing a headless ACP server (`hermes acp`) and MCP facilities. Its installed ACP implementation also exposes native filesystem and shell executors, which must not be enabled directly from FORGE because that would bypass FORGE’s router, validation, execution-context injection, audit log, rollback, cancellation, and visible-browser boundary. A detected CLI therefore reports availability and skill roots while FORGE continues to run the native agent path. This is intentional fallback behavior, not an assertion that Hermes is currently the authoritative executor.

## Next bridge contract

The execution bridge must start Hermes ACP in a constrained toolset and expose FORGE's `ToolRouter` as the only tool surface (for example through a local FORGE-owned MCP server). It must accept a FORGE-supplied bounded context packet and return structured run events and semantic tool calls. The bridge must not receive durable-memory ownership, direct filesystem permissions, or raw credentials. FORGE maps valid tool requests directly through `ToolRouter`, attaches its `ToolExecutionContext`, surfaces events in Agent Actions, and returns bounded tool results to the same Hermes run.

Required event mapping: planning, tool requested, tool started/completed/failed, step completed, task completed/cancelled, provider changed, and model changed. A missing, crashed, or incompatible bridge must keep `NativeForgeRuntime` active.

## Platform behavior

Detection uses a configured command or `hermes` from `PATH`, and derives the Hermes home directory from `HERMES_HOME` or the current user home directory. It does not use brittle fixed macOS, Windows, or Linux executable paths. Linux-only FORGE-OS skills are gated by `process.platform === 'linux'`; no FORGE-OS service behavior is enabled on Windows or macOS.
