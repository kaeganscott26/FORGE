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
});
