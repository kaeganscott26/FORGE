/** Provider-neutral workspace evidence compiled by FORGE for any agent runtime. */
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

export interface CompiledWorkspaceContext {
  systemPrompt: string;
  artifacts: readonly WorkspaceArtifact[];
  omittedArtifactIds: readonly string[];
  characterBudget: number;
  characterCount: number;
}

export interface WorkspaceContextCompiler {
  assemble(query: string, options?: { characterBudget?: number }): Promise<CompiledWorkspaceContext>;
}

export interface AgentContextEnvelope extends CompiledWorkspaceContext {
  query: string;
  generatedAt: number;
}

/**
 * Agent adapters consume FORGE context. They own model-specific transport and execution.
 * FORGE remains responsible for project evidence, memory, chronology, permissions, and tools.
 */
export interface AgentAdapter {
  readonly id: string;
  prepare(context: AgentContextEnvelope): Promise<unknown>;
}

export interface ContextSourceProvider {
  readonly id: string;
  collect(query: string): Promise<readonly WorkspaceArtifact[]>;
}

export interface ContextBudgetPolicy {
  select(artifacts: readonly WorkspaceArtifact[], characterBudget: number): {
    selected: readonly WorkspaceArtifact[];
    omittedArtifactIds: readonly string[];
  };
}
