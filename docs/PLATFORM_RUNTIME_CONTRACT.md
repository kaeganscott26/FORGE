# Platform Runtime Contract

FORGE has one shared TypeScript workspace runtime. Windows, macOS, and Linux differ only at the operating-system adapter boundary; a platform adapter must not change task, context, provider, tool execution, audit, or memory semantics.

## Shared semantic contract

| Capability | Required behavior |
| --- | --- |
| Workspace files and Explorer | Workspace-relative tool paths are normalized with `/`; native filesystem APIs retain their platform separator. Lazy directory expansion returns bounded children or a recoverable error. |
| Terminal and shell | The renderer reports fitted PTY dimensions after its container has a measurable size. Windows uses `cmd.exe` arguments; Unix-like systems use a login shell. |
| Browser | New and close controls use renderer-owned SVG icons. Tabs, navigation, rendered-page reads, and visible-browser operations share typed IPC. |
| Agent runtime | Native FORGE is always available. Provider calls receive semantic tools only; FORGE injects runtime/task/audit identity. |
| Tasks and execution | Task state, checkpoints, cancellation, audit records, and rollback data are workspace-owned and identical on every platform. Valid registered tool calls execute directly on every platform. |
| Providers and Hermes | Ollama and OpenAI-compatible endpoints are provider backends. Hermes remains optional and cannot bypass `ToolRouter`. |

## Platform-specific responsibilities

- Windows: native paths, ConPTY, `cmd.exe`, and NSIS packaging.
- macOS: native filesystem permissions, app sandbox/entitlements, and packaged BrowserView behavior.
- Linux: native paths, login shell, and, only when `FORGE_OS_SESSION=1` or the FORGE desktop session is detected, FORGE-OS desktop/session integration.

FORGE-OS service provisioning is intentionally not represented by the Electron application package. This checkout contains no Arch ISO manifest, pacstrap package list, systemd unit, DBus policy, or bootstrap script. Bluetooth and power-service repair must be made in the owning FORGE-OS build repository and then verified in a real Arch session.

## Verification expectations

Unit tests assert shared path, terminal, task, direct tool execution, IPC, provider, and runtime behavior. Native packaging and UI smoke checks are still required on each target platform because a Windows build cannot validate macOS compositor/layout or Arch service activation.
