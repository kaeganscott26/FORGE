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

  it('allows keyless loopback providers without weakening remote authentication', async () => {
    let headers: HeadersInit | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      headers = init?.headers;
      return new Response(JSON.stringify({ data: [{ id: 'llama3.2:3b', owned_by: 'ollama' }] }), { status: 200 });
    }));
    const local = new OpenAIProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'llama3.2:3b' });
    expect(await local.isConfigured()).toBe(true);
    expect((await local.listModels())[0]?.id).toBe('llama3.2:3b');
    expect(headers).toBeUndefined();
    const remote = new OpenAIProvider({ baseUrl: 'https://compatible.example/v1', model: 'remote-model' });
    expect(await remote.isConfigured()).toBe(false);
    await expect(remote.listModels()).rejects.toThrow(/API key is required for remote/);
  });

  it('accepts Ollama-compatible model catalogs that use a models array', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ models: [{ name: 'qwen2.5-coder:7b' }] }), { status: 200 })));
    const provider = new OpenAIProvider({ baseUrl: 'http://127.0.0.1:11434/v1' });
    expect(await provider.listModels()).toEqual([{ id: 'qwen2.5-coder:7b', ownedBy: undefined }]);
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

  it('retries compatible tool providers that require max_tokens', async () => {
    const bodies: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      if (bodies.length === 1) return new Response(JSON.stringify({ error: { message: 'unknown parameter max_completion_tokens' } }), { status: 400 });
      return new Response(JSON.stringify({ choices: [{ message: { content: '', tool_calls: [{ id: 'local-1', function: { name: 'forge_0_file_read', arguments: '{"path":"README.md"}' } }] } }] }), { status: 200 });
    }));
    const provider = new OpenAIProvider({ baseUrl: 'http://localhost:11434/v1', model: 'local-model' });
    const result = await provider.chatWithTools([{ role: 'user', content: 'read' }], [{ name: 'file.read', description: 'Read', parameters: { type: 'object' } }]);
    expect(bodies[0].max_completion_tokens).toBe(1_600);
    expect(bodies[1].max_tokens).toBe(1_600);
    expect(result.toolCalls[0]?.name).toBe('file.read');
  });

  it('limits loopback models to basic file tools so small models are not flooded by the full catalog', async () => {
    let body: any;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }));
    const provider = new OpenAIProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'local-model' });
    await provider.chatWithTools([{ role: 'user', content: 'inspect' }], [
      { name: 'file.read', description: 'Read', parameters: { type: 'object' } },
      { name: 'file.write', description: 'Write', parameters: { type: 'object' } },
      { name: 'git.commit', description: 'Commit', parameters: { type: 'object' } },
      { name: 'shell.run', description: 'Shell', parameters: { type: 'object' } }
    ]);
    expect(body.tools.map((tool: any) => tool.function.name)).toEqual(['forge_0_file_read', 'forge_1_file_write']);
  });

  it('promotes strict plain JSON only when it names an offered local tool', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"name":"file.read","parameters":{"path":"draft.txt"}}' } }] }), { status: 200 })));
    const provider = new OpenAIProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'local-model' });
    const offered = [{ name: 'file.read', description: 'Read', parameters: { type: 'object' } }];
    const result = await provider.chatWithTools([{ role: 'user', content: 'read' }], offered);
    expect(result.content).toBe('');
    expect(result.toolCalls[0]).toMatchObject({ name: 'file.read', arguments: { path: 'draft.txt' } });

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"name":"git.commit","parameters":{"message":"no"}}' } }] }), { status: 200 })));
    const rejected = await provider.chatWithTools([{ role: 'user', content: 'commit' }], offered);
    expect(rejected.toolCalls).toEqual([]);
    expect(rejected.content).toContain('git.commit');
  });
});
