/** A typed boundary for every artifact that can contribute to an AI turn. */
export type WorkspaceArtifactKind = 'identity' | 'architecture' | 'documentation' | 'source' | 'configuration' | 'git' | 'memory' | 'metadata' | 'conversation';

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

export interface ContextAssemblyRequest {
  query: string;
  workspaceName: string | null;
  artifacts: readonly WorkspaceArtifact[];
  characterBudget: number;
}

export interface ContextAssemblyResult {
  systemPrompt: string;
  artifacts: readonly WorkspaceArtifact[];
  omittedArtifactIds: readonly string[];
  characterBudget: number;
  characterCount: number;
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

/** Future durable decisions and architecture records should implement this store. */
export interface ArchitecturalMemoryStore {
  remember(artifact: WorkspaceArtifact): Promise<void>;
  retrieve(query: string, limit?: number): Promise<readonly WorkspaceArtifact[]>;
}

/** Future project chronology can combine Git, docs, goals, conversations, and decisions behind this contract. */
export interface ProjectTimelineService {
  events(options?: { before?: number; after?: number; limit?: number }): Promise<readonly WorkspaceArtifact[]>;
}

/** Future diff review consumes an explicit evidence bundle instead of reading global process state. */
export interface DiffReviewService {
  review(input: { diff: string; intent?: string; context: ContextAssemblyResult }): Promise<{ summary: string; findings: readonly string[] }>;
}

/** A context inspector may expose this snapshot without exposing provider credentials. */
export interface ContextInspector {
  snapshot(): Promise<ContextAssemblyResult | null>;
}

/** Intent navigation resolves a goal to project evidence rather than to generic editor commands. */
export interface IntentNavigator {
  resolve(intent: string): Promise<readonly { label: string; artifactId: string; path?: string; rationale: string }[]>;
}

export interface WorkspaceIntelligence {
  assemble(request: ContextAssemblyRequest): Promise<ContextAssemblyResult>;
}
