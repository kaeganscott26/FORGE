import { describe, expect, it } from 'vitest';
import { createNativeAgentRuntime, requiredDirectEvidence } from './native-agent-runtime';

describe('native agent direct-evidence requirements', () => {
  it('honors explicit file and Git tool requests', () => {
    expect(requiredDirectEvidence('Use file.search + file.read, then git.log and git.diff.', [])).toEqual(['file.search', 'file.read', 'git.log', 'git.diff']);
    expect(requiredDirectEvidence('Use file.search + file.read, then git.log and git.diff.', ['file.search', 'file.read', 'git.log', 'git.diff'])).toEqual([]);
    expect(requiredDirectEvidence('Read packages/intelligence/src/semantic.ts before answering.', [])).toEqual(['file.read']);
  });

  it('does not allow a bug investigation to stop after file.search', () => {
    expect(requiredDirectEvidence('Investigate the runtime regression.', [])).toEqual(['file.search', 'git.log']);
    expect(requiredDirectEvidence('Investigate the runtime regression.', ['file.search'])).toContain('file.read');
    expect(requiredDirectEvidence('Investigate the runtime regression.', ['file.search', 'file.read', 'git.log'])).toEqual([]);
  });

  it('requires workspace inspection through direct tools when explicitly requested', () => {
    expect(requiredDirectEvidence('Use agent tools to inspect the workspace.', [])).toEqual(['file.search']);
  });
});

describe('native agent evidence-chain recovery', () => {
  it('continues from search through source read before accepting a diagnosis', async () => {
    const turns = [
      { content: 'A plausible guess.', toolCalls: [] },
      { content: '', toolCalls: [{ id: 'search', name: 'file.search', arguments: { query: 'failure', path: '.' }, provider: 'test' }] },
      { content: 'The search is enough.', toolCalls: [] },
      { content: '', toolCalls: [{ id: 'read', name: 'file.read', arguments: { path: 'src/runtime.ts' }, provider: 'test' }] },
      { content: 'Verified diagnosis from current source.', toolCalls: [] }
    ].map((turn) => ({ ...turn, modelId: 'test-model', memories: [], context: { artifacts: [], metrics: {} } }));
    const agent = { askWithTools: async () => turns.shift()!, askWithContext: async () => { throw new Error('unexpected'); } };
    const requested: string[] = [];
    const storage = {
      conversationState: async () => ({ activeConversationId: 'conversation' }), listConversationMessages: async () => [], appendConversation: async () => undefined,
      dashboard: async () => ({ id: 'workspace' }), markSemanticRecordsUsed: async () => undefined
    };
    const toolRouter = {
      providerDefinitions: () => [], request: async (call: any) => {
        requested.push(call.name);
        return { request: { id: call.id, toolName: call.name }, result: { requestId: call.id, toolName: call.name, success: true, output: { evidence: call.name }, affectedPaths: [], warnings: [], durationMs: 1 } };
      }
    };
    const runtime = createNativeAgentRuntime({ storage, workspace: { info: () => ({ rootPath: '/workspace' }) }, agent, toolRouter, taskRuntime: {}, settings: { publicSettings: () => ({ apiModel: 'test-model' }) }, aiProvider: { id: 'test' }, git: { status: async () => ({ branch: 'main', files: [] }) } });
    const result = await runtime.runAgentTurn(undefined, 'Investigate the failure using agent tools to inspect the workspace.');
    expect(requested).toEqual(['file.search', 'file.read']);
    expect(result.content).toContain('Verified diagnosis from current source.');
  });
});
