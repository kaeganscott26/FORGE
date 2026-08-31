# Semantic memory regression repair

This is the implementation record for the FORGE `2.4.0-beta` semantic-context correction. It is not a rollback to FORGE 2.3.0.

## Git boundary

- Starting/current-line commit investigated: `3ff06b3924aa2092a3b37b55a475e09387dcffc1` (`fix(storage): recover malformed workspace databases`).
- First semantic embedding implementation: `ff798b91a1a027a4891214c4da6549fc3336d210` (`feat(context): add native semantic context governor and coordinated release`).
- Immediate pre-embedding behavioral reference: `7c7db2ec61311eeb86f0381767a230b539dc7b3c` (`fix(shell): normalize tool calls before spawn`).
- Later commits after embeddings: `a7f7fe5cfee1f14788b475c49a222846e1f09173` and `d402e9af88e04ab7bebf73b2cc359bc527ac6ada` changed release automation only. `3ff06b3924aa2092a3b37b55a475e09387dcffc1` changed storage recovery and main-process runtime event factoring and was preserved. No repository-wide reset or historical-tree checkout was used.

The retained post-2.3/current-line work includes Hermes (`78455fabb2ab200110564988ed1746e1b4237e77`), FORGE Live (`212b13248782996f76a0fd3baf576ed7d5ecb39c`, `c95b3836ae760edd6a7b6d4f440ba06fe4f2f939`, and `3c44924d264c1814fc82bd11b22c998ec979561d`), Browser/Home and updater work (`3c601680d6028c3d4f2ebd390cd5b7cb9e880fb7`, `d2396a15768538c657665768dc7d3003dc4258d0`, `79ff7ab5d0de2f58a4363cfa7963466a9e488726`, and `8f55c75fdeff9e2b7229d3a89cad067ea6c24508`), and the current task, memory, ToolRouter, native runtime, packaging, and cross-platform work.

## Verified cause

The original implementation assembled semantic context on every prompt, requested as many as 24 records, and allowed it to consume 70% of a nominal 32,000-token budget. A query loaded and JSON-parsed as many as 50,000 stored vectors even when semantic context was disabled, then used cached lexical records after provider failure. Workspace mutation IPC and the file watcher could both initiate broad refreshes.

Indexing embedded files individually. Each chunk upsert exported the complete sql.js database, allocating a new database-sized `ArrayBuffer`; vectors were also retained as verbose JSON. The investigated workspace database held 110 records from only 26 sources, with repeated chunks from the same UI files, 1,024 values per vector, roughly 1.40 MB of vector JSON, and a roughly 16 MB database. This combination explains the RAM pressure, duplicate context, rebuild latency, and a credible sql.js/WASM allocation failure path. Source, journal, and crash-log searches did not reproduce a current literal `memory access out of bounds` exception, so ordinary JavaScript string slicing is not claimed as its cause.

The system journal did contain a historical `SIGSEGV` for the older packaged main process (PID 58806 on 2026-08-26) during a deliberately headless launch. Its native stack passed through V8 and Node's `fs::FileHandle::CloseReq`, but it contained no JavaScript exception, WebAssembly bounds message, or OOM event; the same launch also had display/desktop-portal failures. That record therefore does not prove an embedding bounds error. The repaired shutdown path nevertheless removes the semantic storage race visible in the old source by cancelling and draining the indexer before closing sql.js.

Ollama also retained `qwen3-embedding:0.6b` for its default keep-alive interval. A direct measurement observed a roughly 350 MB worker RSS and an API-reported 2,471,315,373-byte model allocation after warm-up. An explicit zero keep-alive request unloaded it successfully.

## Repair

- Semantic discovery is off on fresh installs and lazy when enabled. Explicit file/tool/Git requests and investigations skip automatic semantic retrieval.
- The authority order is explicit files/tools, current source, current Git, task/runtime state, semantic retrieval, durable history, then model prior knowledge.
- Native agent execution fail-closes if a provider tries to answer before successful explicitly requested reads/searches/Git evidence. Investigations cannot stop at `file.search`; they proceed to `file.read`.
- Retrieval defaults to eight unique results, hard-caps at ten and 4,000 tokens, selects at most one overlapping result per source, rejects changed files, and injects no stale, partial, incompatible, or failed-provider fallback records.
- Float32 SQLite blobs replace JSON vectors. Schema migration rewrites legacy vectors, index writes use one batched database export, superseded records are pruned, and unchanged incremental scans produce no embeddings.
- File-watch refreshes are path-specific and coalesced. Task/memory changes refresh only durable state. A full 66-record rebuild uses bounded source and embedding batches. Workspace switching cancels/drains indexing before closing the old database.
- Durable refreshes supersede records whose task, memory, conversation, or retained tool-action source was deleted, preventing removed historical state from remaining active.
- The local Ollama model is shared within an operation, embedding calls are serialized with a timeout, and a zero keep-alive unload is sent after retrieval or indexing. Semantic failure injects nothing, does not loop, and never prevents direct/native operation.

## Reproducible measurement

Run `npm run profile:semantic-memory` with local Ollama and `qwen3-embedding:0.6b`. The 2026-08-26 Linux profile used a generated 66-file workspace and forced garbage collection between phases.

| Phase | FORGE profiler RSS | JS heap used | Ollama/worker RSS | Result |
| --- | ---: | ---: | ---: | --- |
| semantic disabled | 184,377,344 B | 18,933,792 B | 62,959,616 B | no model |
| enabled, idle | 191,868,928 B | 20,180,992 B | 62,959,616 B | no model |
| model loaded/idle | 181,743,616 B | 21,302,728 B | 426,000,384 B | model loaded for measurement |
| one semantic query | 194,965,504 B | 20,094,520 B | 61,624,320 B | one result; model unloaded |
| 66-record rebuild | 194,314,240 B | 19,724,192 B | 63,737,856 B | 8.338 s; model unloaded |
| direct tool workflow | 194,445,312 B | 21,073,648 B | 63,737,856 B | 9 ms; no model |
| repeated cycle 1 | 194,379,776 B | 18,050,128 B | 95,879,168 B | no loaded model; unload worker exiting |
| repeated cycle 2 | 195,203,072 B | 17,910,392 B | 71,876,608 B | no loaded model |
| repeated cycle 3 | 195,334,144 B | 17,975,968 B | 69,779,456 B | no loaded model |
| post-release | 195,465,216 B | 17,948,888 B | 69,779,456 B | 1,815,160 B live ArrayBuffers; daemon only |

The process RSS reached a stable allocator high-water mark, while heap, ArrayBuffer use, and successive cycle RSS did not grow cumulatively. Ollama reported no loaded model after each operation; transient unload workers exited before the post-release sample, which contained only the daemon. A semantic-context-disabled desktop observation separately showed an approximately 354.2 MiB main process and renderer processes at approximately 245.9 MiB and 361.1 MiB; summed per-process RSS is only an upper bound because shared Electron pages are counted repeatedly.

## Decision

**EMBEDDINGS RETAINED AND REPAIRED.** The repair landed on `2.4.0-beta` and remains the optional discovery layer in the v2.5 candidate, not an authority or startup dependency.

## 2.5 validation rerun

The Linux profile was rerun on 2026-08-31 before the v2.5 local packaging pass. A 66-record rebuild and three repeated retrieval/index cycles completed without a WebAssembly bounds fault. FORGE RSS rose from about 178 MB at launch to a stable allocator plateau near 209 MB; heap use returned to about 20 MB and live ArrayBuffers returned to about 1.44 MB. Ollama reported the embedding model's 2,471,315,373-byte allocation while loaded and no loaded model after each scoped operation. This validates the repaired lifecycle on the target machine; it does not replace native package and long-duration acceptance testing.
