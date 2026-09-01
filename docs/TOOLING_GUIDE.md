# Tools in Plain English

This guide describes the tool runtime shipped by `2.5.0-beta`.

FORGE's agent can use registered, available tools immediately when it supplies valid operation arguments. The model asks for the operation; FORGE validates it, injects private runtime/task context, executes it under the current OS user, records the outcome, and returns bounded evidence to the agent.

This applies uniformly to file changes, shell commands, Git operations, visible-browser actions, task processes, configured web/GitHub operations, and Hermes-routed requests. Agent Actions shows the live work and lets you cancel it; it does not ask for Allow/Deny decisions.

FORGE still rejects malformed schemas, unavailable tools, invalid paths, and invalid runtime state. It keeps atomic writes and available rollback data, timeouts, cancellation, redacted audit history, secret storage, bounded tool evidence, and loop/retry protections. A failing optional command or missing file returns useful error evidence so the agent can recover rather than ending the run unnecessarily.

Only semantic operation arguments are provider-visible. FORGE supplies workspace, conversation, model, task, step, and audit linkage internally, so switching models or using Hermes does not change workspace ownership or tool semantics.

For workspace questions, explicit user-directed evidence comes first, followed by current source Tool Results, current Git evidence, and task/runtime state. Optional semantic discovery and durable memory cannot substitute for those reads. A debugging run that uses `file.search` continues with `file.read` of the relevant implementation and traces callers, tests, and Git evidence before concluding. The native runtime prompts the provider again—and fails closed instead of guessing—when an explicitly requested read-only evidence tool was omitted.
