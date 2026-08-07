/** Provider-neutral workspace evidence that can be compiled for any agent runtime. */
export type WorkspaceArtifactKind = 'identity' | 'architecture' | 'documentation' | 'source' | 'configuration' | 'git' | 'memory' | 'metadata' | 'conversation' | 'terminal';

export interface WorkspaceArtifact {
  id: string;
  kind: WorkspaceArtifactKind;
  title: string;
  content: string;
  path?: string;
  priority: number;
  updatedAt?: number;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ContextAssemblyResult {
  systemPrompt: string;
  artifacts: readonly WorkspaceArtifact[];
  omittedArtifactIds: readonly string[];
  characterBudget: number;
  characterCount: number;
}

export interface ContextBudgetPolicy {
  select(artifacts: readonly WorkspaceArtifact[], characterBudget: number): {
    selected: readonly WorkspaceArtifact[];
    omittedArtifactIds: readonly string[];
  };
}

/** Small stable interface consumed by Codex, Ollama, hosted providers, or any future agent adapter. */
export interface WorkspaceContextCompiler {
  assemble(query: string, memories?: readonly unknown[] | null, characterBudget?: number): Promise<ContextAssemblyResult>;
}

export interface AgentContextEnvelope {
  query: string;
  systemPrompt: string;
  artifacts: readonly WorkspaceArtifact[];
  omittedArtifactIds: readonly string[];
  generatedAt: number;
}

/** Adapter contract: FORGE compiles context; the external runtime decides how to execute. */
export interface AgentAdapter {
  readonly id: string;
  prepare(context: AgentContextEnvelope): Promise<unknown>;
}

export interface ContextSourceProvider {
  readonly id: string;
  collect(query: string): Promise<readonly WorkspaceArtifact[]>;
}

export interface ArchitecturalMemoryStore {
  remember(artifact: WorkspaceArtifact): Promise<void>;
  retrieve(query: string, limit?: number): Promise<readonly WorkspaceArtifact[]>;
}

export interface ProjectTimelineService {
  events(options?: { before?: number; after?: number; limit?: number }): Promise<readonly WorkspaceArtifact[]>;
}

export interface ContextInspector {
  snapshot(): Promise<ContextAssemblyResult | null>;
}
