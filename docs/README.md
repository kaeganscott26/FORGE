# 🗺️ FORGE Documentation

This directory is the map for people building with, evaluating, or extending FORGE. Start with the outcome you need, then follow the narrowest relevant guide.

## 🚀 Start here

| Goal | Read |
| --- | --- |
| Understand why FORGE exists and why the workspace outlives any model | [Workspace Philosophy](PHILOSOPHY.md) |
| Run or contribute to the desktop application | [Contributing](CONTRIBUTING.md) |
| Understand the service boundaries and data ownership model | [Architecture](ARCHITECTURE.md) |
| Use a CLI agent in the workspace terminal | [Integrated Terminal](TERMINAL.md) |
| Configure a provider, model, GitHub token, or release credential | [User Configuration](../UserConfig.md) |
| Use FORGE day to day | [User Manual](../UserManual.md) |
| Understand the built-in agent and every available tool | [Tools in Plain English](TOOLING_GUIDE.md) |

## 🧱 Runtime and safety

- [Architecture](ARCHITECTURE.md) — Electron services, renderer boundary, providers, persistence, and update discovery.
- [Core Architecture](Architecture/Core.md) — reusable `@forge/core` contracts and future runtime adapters.
- [Agent Tools](AGENT_TOOLS.md) — provider-neutral tool routing and bounded continuation.
- [Tools in Plain English](TOOLING_GUIDE.md) — what the agent can request, when it needs approval, its limits, and how to change models.
- [Tool Security](TOOL_SECURITY.md) — threat model, side-effect policy, approvals, filesystem, shell, web, and secret controls.
- [Persistent Tasks](PERSISTENT_TASKS.md) — durable task state, checkpoints, handoffs, and process reconciliation.
- [Task Recovery](TASK_RECOVERY.md) — how a human or replacement agent resumes safely.
- [Integrated Terminal](TERMINAL.md) — user-controlled PTYs and CLI-agent workflows.

## 📦 Build and release

- [Current Project Status](PROJECT_STATUS.md) — implemented scope, current release evidence, and known limits.
- [Release Channels](RELEASE_CHANNELS.md) — forward-only Stable/Beta selection.
- [Build Artifact Policy](BUILD_ARTIFACT_POLICY.md) — manifest-led artifact selection and cleanup.
- [Releasing FORGE](../RELEASING.md) — exact source, tag, workflow, package, and public-hash procedure.
- [Native packaging](PACKAGING.md) — repeatable macOS, Linux, and Windows package procedures, runtime-identity parity, and artifact expectations.
- [Current Release Notes](../RELEASE_NOTES.md) — user-facing FORGE v2.3 Beta changes.
- [FORGE 2.3 beta verification](V2.3.0_BETA1_VERIFICATION.md) — tag, workflow, and published-asset evidence for `v2.3.0-beta.1`.

## 🗃️ Historical records

Historical evidence remains available for auditability, but it does not describe the supported product today. Current behavior and release identity live in the documents above.

- [Historical archive](archive/README.md)
- [Changelog](../CHANGELOG.md)
- [Development arc](Development_arc.md) — historical narrative, not a current implementation contract.
- [Beta product review](FORGE_REVIEW.md) — point-in-time critique and recommendations; current status supersedes its measurements.
- [Platform and market thesis](FORGE_PLATFORM_MARKET_THESIS.md) — product-positioning hypothesis, not runtime evidence.

## ✍️ Documentation contract

Documentation is part of the product surface. When behavior, policy, storage ownership, security posture, release identity, or a developer workflow changes, update the narrowest applicable document and add a link from this index if it creates a new entry point. Do not rewrite historical verification evidence to make it look current—archive it and label it instead.
