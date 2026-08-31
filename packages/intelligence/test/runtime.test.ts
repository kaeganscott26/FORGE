import { describe, expect, it } from 'vitest';
import { packetMetrics, shouldUseSemanticRetrieval, WorkspaceIntelligenceService } from '../src';

describe('WorkspaceIntelligenceService', () => {
  it('assembles provider-neutral context and fresh observations without a configured model', async () => {
    const writes: string[] = [];
    const service = new WorkspaceIntelligenceService({ assemble: async () => ({ systemPrompt: 'workspace evidence', artifacts: [], omittedArtifactIds: [], characterBudget: 100, characterCount: 18 }) }, {
      recordProjectObservation: async (kind) => { writes.push(kind); },
      listProjectObservations: async () => [{ id: 'observation-1', kind: 'file.changed', timestamp: 10, payload: { paths: ['src/app.ts'] } }]
    });
    await service.invalidate('file.changed', { paths: ['src/app.ts'] });
    const packet = await service.packet('inspect the app');
    expect(writes).toEqual(['file.changed']);
    expect(packet.projectObservations[0]).toMatchObject({ kind: 'file.changed' });
    expect(packet.systemPrompt).toContain('Fresh project observations');
  });

  it('keeps the real packet for telemetry and rebuilds it after invalidation', async () => {
    let assemblies = 0;
    const service = new WorkspaceIntelligenceService({ assemble: async (query: string) => ({ systemPrompt: query || 'baseline', artifacts: [{ id: String(++assemblies), kind: 'memory', title: 'Decision', content: 'remember this', priority: 50 }], omittedArtifactIds: [], characterBudget: 100, characterCount: 8, metrics: { tokensUsed: 2, tokenBudget: 100 } }) });
    const first = await service.packet('actual question');
    expect((await service.snapshot()).query).toBe('actual question');
    await service.invalidate('memory.changed');
    const rebuilt = await service.snapshot();
    expect(rebuilt.query).toBe('');
    expect(rebuilt.generatedAt).toBeGreaterThanOrEqual(first.generatedAt);
    expect(assemblies).toBe(2);
  });
});

describe('packet metrics', () => {
  it('reports deterministic files and memories instead of semantic-only zeroes', () => {
    const metrics = packetMetrics([
      { id: 'source', kind: 'source', title: 'app.ts', content: 'code', priority: 90, metadata: { relevance: 90 } },
      { id: 'memory', kind: 'memory', title: 'Decision', content: 'history', priority: 50, metadata: { relevance: 80 } }
    ], 3, 1200, 32000, { tokensUsed: 0, tokenBudget: 32000, relevance: 0, freshness: 0, authority: 0, redundancy: 0, staleRatio: 0, recordsConsidered: 0, recordsSelected: 0, sourceDistribution: {}, degraded: false });
    expect(metrics).toMatchObject({ tokensUsed: 1200, recordsSelected: 2, recordsConsidered: 3, sourceDistribution: { source: 1, memory: 1 } });
    expect(metrics.relevance).toBeCloseTo(0.85);
    expect(metrics.authority).toBeGreaterThan(0);
  });
});

describe('semantic retrieval routing', () => {
  it('keeps explicit tools, investigations, continuations, and direct source matches tool-first', () => {
    expect(shouldUseSemanticRetrieval('Use agent tools to inspect the workspace', { sourceFiles: [] })).toBe(false);
    expect(shouldUseSemanticRetrieval('Diagnose this memory regression', { sourceFiles: [] })).toBe(false);
    expect(shouldUseSemanticRetrieval('Continue the original request using Tool Results', { sourceFiles: [] })).toBe(false);
    expect(shouldUseSemanticRetrieval('Explain context architecture', { sourceFiles: [{ path: 'context.ts' }] as any })).toBe(false);
  });

  it('uses semantic discovery only for broad concepts without direct source evidence', () => {
    expect(shouldUseSemanticRetrieval('Explain the relationship between ripple theory and project decisions', { sourceFiles: [] })).toBe(true);
  });
});
