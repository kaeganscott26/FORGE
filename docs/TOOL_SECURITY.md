# 🛡️ Tool Security

## 🔍 Threat model

Model output, renderer input, workspace paths, terminal output, Git metadata, web content, and provider responses are untrusted. A tool call is data, not permission. Security enforcement lives in the Electron main process and reusable non-renderer packages.

The renderer runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`. The sandboxed CommonJS preload exposes only fixed, allowlisted request channels plus a fixed terminal-event subscription. New windows and unexpected navigation are denied. The packaged renderer loads from `file://` inside `app.asar`; no localhost server is required.

## ✅ Side effects and approval

- Read-only workspace/Git tools may run automatically.
- Reversible workspace changes require approval. “Allow exact scope this session” binds workspace, tool, and a hashed path/path-set scope, expires in at most one hour, and is cleared on workspace change.
- Deletes, command execution, dependency changes, commits, remote Git, external requests, credentials, and releases always require a fresh Run once decision.

The router derives the audit reason from the tool purpose and current user request; the model and user never supply execution IDs or bookkeeping reasons. The approval card shows tool, side effect, inferred reason, target, working directory, network use, external-data description, expected effect, predicted paths, and a diff for file writes. Completed and rejected requests remain visible for the runtime, and the persistent audit log survives restarts with workspace/conversation/model and optional task/step linkage.

Persistent task rows record approval history but do not confer authority. On resume, every unfinished non-read step must create or use a currently valid exact tool request under the existing policy. There is no whole-task approval and a consumed or expired decision cannot be replayed.

## 🗂️ Filesystem controls

Normal tools accept only relative paths. Resolution canonicalizes the workspace root, rejects traversal before access, resolves the nearest existing ancestor for creates, and rejects symlink escapes. Text reads reject binary or oversized data. Writes retain UTF-8 BOM state and mode when possible, use same-directory temporary files plus atomic rename, refuse unsaved editor paths, and store rollback backups under ignored `.forge/backups/`. Delete refers to the source path; removing an indexed memory copy remains a different operation.

## 🖥️ Shell and terminal controls

`shell.run` never concatenates a command string. It spawns an approved executable with an argument array, validates the working directory, provides only `PATH`, locale, terminal, temporary-directory values plus explicitly allowlisted non-secret variables, caps timeout/output, supports cancellation, and terminates the process group. Secret-like environment names are blocked.

`task.process.start` applies the same executable, argument, environment, working-directory, and explicit-approval controls, then detaches the process and appends output under the active workspace's `.forge/task-output/`. FORGE records PID/output/audit evidence but does not treat process start as step completion. Cancellation of task tracking never silently terminates a process or remote operation.

The integrated terminal is a user-controlled PTY, not an agent permission bypass. `node-pty` runs in main, is unpacked from `app.asar`, and its native module/helper are universal in the universal package. The renderer can create, resize, write to, terminate, restart, clear, copy, and switch sessions through fixed IPC. Terminal `cwd` is workspace-contained. Recent output is memory-bounded and not automatically indexed.

## 🔐 Web and secret controls

Web research is controlled in Settings and can be disabled at any time. Only HTTP(S) is accepted. Credential-bearing URLs, file URLs, localhost, `.local`, private/link-local/multicast IPs, unsafe DNS answers, and unsafe redirects are blocked. DNS is checked both before the request and again by the actual connection resolver to limit rebinding attacks. Redirect count, timeout, content type, and response size are bounded. The optional Browser uses sandboxed native views and workspace-scoped bookmarks/history. Enabled bounded page reads/finds are automatic; navigation remains explicitly approved. It never exposes browser automation, Node.js, workspace files, shell, or credentials to page content.

AI provider endpoints must use HTTPS unless they are loopback-only local providers. Provider URLs cannot embed credentials.

AI and GitHub secrets remain encrypted by `safeStorage`; Git HTTPS uses the existing temporary ask-pass path. Audit sanitization redacts token/secret/password/authorization/credential keys and known token shapes. Tool evidence is sanitized and limited before being returned to a model.

## 🚧 Known limitations

- The beta is ad-hoc/unsigned and not notarized unless final workflow evidence proves otherwise. It does not currently provide a trusted unattended-update chain.
- External AI providers necessarily receive the bounded context selected for a user prompt; users must configure and trust their chosen provider.
- Web search currently parses a simple public HTML endpoint rather than a contracted search API, so result quality can vary.
- Rollback backups are local recovery aids, not a transactional filesystem or backup system.
- Plugin-contributed executable tools are not enabled; future extensibility must use the same registry, policy, approval, and audit gates.
- The renderer bundle is large and not code-split; this affects performance, not the privilege boundary.
- Task payloads and events are sanitized and bounded, but a durable cross-restart process supervisor and scheduled remote-service watcher are not implemented. Missing-process recovery fails closed for explicit verification.
