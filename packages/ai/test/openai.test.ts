import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OPENAI_MODEL, OpenAIProvider } from '../src/openai';

afterEach(() => vi.unstubAllGlobals());

describe('OpenAIProvider models', () => {
  it('uses the current GPT-5.x default without restricting custom model IDs', async () => {
    let body: any;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }));
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    await provider.chat([{ role: 'user', content: 'hello' }]);
    expect(DEFAULT_OPENAI_MODEL).toBe('gpt-5.6-sol');
    expect(body.model).toBe(DEFAULT_OPENAI_MODEL);
    await provider.chat([{ role: 'user', content: 'hello' }], 'future-provider-model');
    expect(body.model).toBe('future-provider-model');
  });

  it('lists and validates models from the provider API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'gpt-5.6-sol', owned_by: 'openai' }, { id: 'custom-1', owned_by: 'compatible' }] }), { status: 200 })));
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    expect((await provider.listModels()).map((model) => model.id)).toEqual(['custom-1', 'gpt-5.6-sol']);
    expect(await provider.validateModel('custom-1')).toEqual({ model: 'custom-1', exists: true, availableCount: 2 });
    expect((await provider.validateModel('not-yet-available')).exists).toBe(false);
  });

  it('gracefully explains unsupported models', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'model_not_found', message: 'model does not exist' } }), { status: 404 })));
    const provider = new OpenAIProvider({ apiKey: 'test-key', model: 'missing-model' });
    await expect(provider.chat([{ role: 'user', content: 'hello' }])).rejects.toThrow('unsupported or unavailable');
  });

  it('adapts dotted FORGE tool names to provider-safe aliases and restores them', async () => {
    let url = '';
    let body: any;
    vi.stubGlobal('fetch', vi.fn(async (requestUrl: string, init: RequestInit) => {
      url = requestUrl;
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ model: 'gpt-5.6-sol-2026-08-01', output: [{ type: 'function_call', call_id: 'call-1', name: 'forge_0_file_read', arguments: '{"path":"README.md"}' }] }), { status: 200 });
    }));
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    const response = await provider.chatWithTools([{ role: 'user', content: 'read it' }], [{ name: 'file.read', description: 'Read a workspace file', parameters: { type: 'object' } }]);
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(body.tools[0].name).toBe('forge_0_file_read');
    expect(body.tools[0].function).toBeUndefined();
    expect(body.input).toEqual([{ role: 'user', content: 'read it' }]);
    expect(body.max_output_tokens).toBe(1_600);
    expect(body.reasoning_effort).toBeUndefined();
    expect(response.toolCalls).toEqual([{ id: 'call-1', name: 'file.read', arguments: { path: 'README.md' }, provider: 'openai' }]);
    expect(response.modelId).toBe('gpt-5.6-sol-2026-08-01');
  });

  it('reads direct assistant text from a GPT-5.6 Responses result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'No tool is needed.' }] }] }), { status: 200 })));
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    const response = await provider.chatWithTools([{ role: 'user', content: 'answer directly' }], []);
    expect(response.content).toBe('No tool is needed.');
    expect(response.toolCalls).toEqual([]);
  });

  it('keeps Chat Completions tool compatibility for non-GPT-5.6 model IDs', async () => {
    let url = '';
    let body: any;
    vi.stubGlobal('fetch', vi.fn(async (requestUrl: string, init: RequestInit) => {
      url = requestUrl; body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }));
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    await provider.chatWithTools([{ role: 'user', content: 'hello' }], [{ name: 'git.status', description: 'Read Git status', parameters: { type: 'object' } }], 'compatible-model');
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(body.tools[0].function.name).toBe('forge_0_git_status');
    expect(body.max_completion_tokens).toBe(1_600);
  });
});
