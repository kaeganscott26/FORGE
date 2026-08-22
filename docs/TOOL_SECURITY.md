# Tool Runtime Reliability and Security

FORGE does not maintain a tool authorization or approval layer. Valid calls to registered tools available on the current platform execute with the permissions of the FORGE process and user account.

Execution remains constrained by engineering boundaries: provider calls are schema-validated; runtime/task/audit context is injected privately; path and input normalization reject malformed operations; tool timeouts, cancellation, and process-tree controls bound execution; writes retain atomic/rollback behavior where supported; and secret values are redacted from conversations and audit records. The model cannot obtain raw Electron, Node, credential, IPC, or filesystem APIs.

The audit log is observability rather than authorization. It records sanitized request inputs, lifecycle state, duration, outputs, affected paths, exit code, rollback data, model/conversation identity, and task linkage. External web data and browser content remain labeled and bounded before model reuse.

Hermes and every provider use the same `ToolRouter`. Hermes must not expose an independent filesystem, shell, browser, or credential executor inside FORGE; its semantic requests are validated and executed through the shared runtime.
