import type { MemoryEntry } from '@forge/memory';
import type { WorkspaceContextPacket } from './types';

export interface ContextAssemblyService {
  assemble(query: string, memories?: MemoryEntry[] | null, characterBudget?: number): Promise<unknown>;
  packet(query: string, memories?: MemoryEntry[] | null, characterBudget?: number): Promise<WorkspaceContextPacket>;
}

export interface ProjectObservationService {
  recordProjectObservation(kind: string, payload: unknown): Promise<unknown>;
  listProjectObservations(limit?: number): Promise<Array<{ id: string; kind: string; timestamp: number; payload: unknown }>>;
}

/**
 * Project-owned intelligence facade. It remains usable without a provider or
 * chat session and records freshness invalidations for the next context packet.
 */
export class WorkspaceIntelligenceService implements ContextAssemblyService {
  private invalidatedAt: number | undefined;
  private readonly invalidationReasons = new Set<string>();

  constructor(private readonly context: { assemble(query: string, memories?: MemoryEntry[] | null, characterBudget?: number): Promise<any> }, private readonly observations?: ProjectObservationService) {}

  async invalidate(reason: string, payload: unknown = {}): Promise<void> {
    this.invalidatedAt = Date.now();
    this.invalidationReasons.add(reason);
    await this.observations?.recordProjectObservation(reason, payload);
  }

  async assemble(query: string, memories?: MemoryEntry[] | null, characterBudget?: number): Promise<any> {
    return this.context.assemble(query, memories, characterBudget);
  }

  async packet(query: string, memories?: MemoryEntry[] | null, characterBudget?: number): Promise<WorkspaceContextPacket> {
    const compiled = await this.assemble(query, memories, characterBudget);
    const projectObservations = await this.observations?.listProjectObservations() ?? [];
    const observationContent = projectObservations.length ? JSON.stringify(projectObservations, null, 2).slice(0, 8_000) : '';
    const artifact = observationContent ? { id: 'project-observations', kind: 'metadata' as const, title: 'Fresh project observations', content: observationContent, priority: 99, updatedAt: projectObservations[0]?.timestamp, metadata: { relevance: 99, reason: 'Durable observations invalidate stale cached context.' } } : null;
    const systemPrompt = artifact ? `${compiled.systemPrompt}\n\n## ${artifact.title}\n${artifact.content}` : compiled.systemPrompt;
    return { ...compiled, systemPrompt, artifacts: artifact ? [artifact, ...compiled.artifacts] : compiled.artifacts, characterCount: systemPrompt.length, query, generatedAt: Date.now(), invalidatedAt: this.invalidatedAt, invalidationReasons: [...this.invalidationReasons], projectObservations };
  }
}
