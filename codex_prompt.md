# Codex implementation prompt: Cloudflare-backed FORGE memory and AIFRED integration

You are working in the FORGE repository. Treat the repository, its documentation, current Git state, and the Cloudflare dashboard observation below as authoritative starting context. Do not make destructive changes, expose secrets, or deploy anything without explicit approval.

## Product intent

Configure FORGE so Cloudflare can provide an online, durable R2-backed memory layer and a controlled API gateway/runtime for LLM model calls. Then inspect the AIFRED repository and propose—and, after approval, implement—the safest integration that connects AIFRED to FORGE through Cloudflare, with FORGE acting as the administrative app/control plane.

The desired conceptual relationship is:

```text
FORGE desktop admin app
        │ authenticated admin/control requests
        ▼
Cloudflare control plane
  Workers / API gateway / auth / audit
        ├── R2: durable project memory and artifacts
        ├── D1/KV/Queues/etc. only where justified by evidence
        └── provider adapters or AI Gateway for model API calls
                         │
                         ▼
                    LLM providers

AIFRED ── authenticated Cloudflare API ──► FORGE-managed workspace/project services
```

Do not assume that R2 alone is a database. Design explicit object keys, metadata, versioning/concurrency behavior, indexing strategy, retention/deletion behavior, and a migration path from FORGE's current local SQLite memory. Preserve local-first operation and define offline/degraded behavior.

## Cloudflare dashboard observation

A browser read was approved and completed at:
`https://dash.cloudflare.com/b5bd4e29593c5e9ebb17ce26f2ae8f8d/home`

The visible account home showed Cloudflare products including Workers & Pages, Workers AI, AI Gateway, MCP Portals, Vectorize, AI Search, Agents, R2 Object Storage, D1, KV, Durable Objects, Queues, Hyperdrive, Secrets Store, and account API tokens. It also showed an existing `north3rnlight3r` Worker and domains including `north3rnlight3r.com` and `north3rnlight3r.co`. This is UI evidence only; do not infer resource IDs, bindings, production configuration, or permissions from it. Query or document those only through approved, authenticated configuration steps.

## Required workflow

1. Read `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATUS.md`, `docs/TOOL_SECURITY.md`, `docs/AGENT_TOOLS.md`, `docs/PERSISTENT_TASKS.md`, `UserConfig.md`, and the relevant package/source files before proposing changes.
2. Inventory the current FORGE memory, storage, intelligence, provider, IPC, tool-policy, audit, and configuration boundaries. Identify exactly where a Cloudflare adapter belongs; do not bypass the Electron main-process/renderer security boundary.
3. Locate the AIFRED repository without guessing. Search the workspace and nearby project directories for its root and inspect its README, architecture, package manifests, deployment configuration, API surface, authentication, data model, and tests. If it is unavailable, stop at an integration plan and clearly list the missing evidence.
4. Produce a written architecture proposal before implementation. Compare at least:
   - R2 as an object-backed memory store with a metadata/index layer;
   - R2 plus D1 or Durable Objects for indexes, leases, and consistency;
   - Cloudflare Workers AI Gateway/proxy versus direct provider calls;
   - local-first sync, conflict resolution, encryption, tenant/workspace isolation, and deletion.
5. Define a threat model. Secrets must remain in Cloudflare Secrets/Workers bindings or OS/user configuration—not source, prompts, renderer bundles, R2 objects, logs, or Git. Use least-privilege scoped tokens, authenticated service-to-service calls, request validation, replay protection where needed, rate limits, audit events, and bounded payloads. Never upload the entire workspace or conversation history by default.
6. Define typed contracts for FORGE↔Cloudflare and AIFRED↔Cloudflare: health/version, workspace registration, memory put/get/search/list/delete, sync/checkpoint, model request/stream, errors, auth claims, quotas, and audit correlation IDs. Include schema versioning and backwards compatibility.
7. Define a phased implementation plan with acceptance tests, rollback steps, local development emulation, environment variables, Cloudflare Wrangler configuration, migrations, and release documentation. Distinguish code that can be implemented now from deployment steps requiring human credentials/approval.
8. Only after the proposal is reviewed/approved, implement the smallest vertical slice with tests. Prefer an interface plus local/mock adapter first, then a Cloudflare Worker/R2 adapter. Keep existing local behavior functional and fail closed when remote configuration is absent.
9. Scan AIFRED for the minimum integration surface and avoid coupling its internals to FORGE. Prefer a stable Cloudflare API contract, webhooks/events, or an MCP/API adapter where appropriate. Document whether FORGE is an admin app only or also a runtime data plane; keep that distinction explicit.
10. Run the narrowest relevant typecheck, lint, unit/integration tests, build, and `git diff --check`. Report any checks not run and why. Do not commit, push, create Cloudflare resources, or alter production DNS without explicit approval.

## Deliverables

- `docs/` architecture/design note for Cloudflare memory and API integration.
- AIFRED integration assessment, including its discovered path, relevant components, risks, and proposed contract.
- Configuration and secret-management plan with `.env.example` updates only for variable names/placeholders.
- Typed API/schema definitions and tests for the approved vertical slice, if implementation is authorized.
- Migration, backup, retention, export, and deletion procedures for local SQLite ↔ R2-backed memory.
- Security and privacy review covering workspace isolation, encryption, provider data handling, logs, and Cloudflare account permissions.
- A concise list of manual Cloudflare dashboard/Wrangler steps, clearly separated from repository changes.
- Final verification report with changed files, test results, unresolved questions, and rollback instructions.

## Constraints and decision principles

- FORGE remains the workspace authority and admin app; the model remains replaceable.
- Preserve current provider-neutral intelligence and agent-tool boundaries.
- Keep the renderer constrained; privileged network, filesystem, Git, and secret operations belong in the main process or approved backend.
- No silent cloud upload, no implicit telemetry, and no cloud-only data loss path.
- Make sync opt-in, visible, bounded, auditable, and reversible.
- Prefer explicit typed contracts over provider-specific assumptions.
- Treat all findings about AIFRED and Cloudflare as evidence with paths/URLs/timestamps, not assumptions.

Start by returning an evidence-backed inventory and architecture proposal. Do not begin deployment or irreversible migration until the proposal and the exact change set are approved.
