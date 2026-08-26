# Native Semantic Context

FORGE 2.4.0-beta adds a local-first semantic layer owned by the workspace. The inference model reasons; the embedding model only represents text for retrieval.

```text
task → query embedding → semantic candidates → authority/freshness/task scoring
     → stale/supersession/deduplication → token budget → provenance-rich packet
     → Native FORGE or Hermes → ToolRouter → workspace memory and index updates
```

Settings keep inference and semantic context independent. The default embedding endpoint is Ollama's OpenAI-compatible loopback API (`http://127.0.0.1:11434/v1`) with `qwen3-embedding:0.6b`; any compatible model may be selected. Remote endpoints require explicit configuration and credentials stored by the OS secure credential service.

The SQLite workspace database stores hashed, revisioned chunks, serialized vectors, model/dimension metadata, lifecycle state, authority, usage, and provenance. Indexing is incremental: unchanged content is not embedded again. Sensitive files, credentials, private keys, `.env` files, generated output, dependency trees, caches, `.git`, ISO trees, and packaged output are excluded.

Retrieval ranks candidates with semantic relevance plus task relationship, source authority, freshness, and conservative prior usefulness, minus staleness, redundancy, and supersession penalties. Old records remain searchable when highly relevant, while newer revisions normally supersede older active context. The context governor assembles a bounded packet and reports selected sources and live health metrics to Context Health.

If the embedding service is unavailable, FORGE records a degraded state and falls back to deterministic lexical retrieval; agent execution and ToolRouter governance continue normally. Rebuild the index from Settings after changing embedding models or dimensions.

On Linux, Hermes may use ACP where available. macOS and Windows use the supported headless bridge when configured. These transport differences do not change workspace ownership, context selection, cancellation, audit, or ToolRouter behavior.
