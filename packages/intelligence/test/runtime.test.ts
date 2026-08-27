import { describe, expect, it } from 'vitest';
import { shouldUseSemanticRetrieval, WorkspaceIntelligenceService } from '../src';

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
