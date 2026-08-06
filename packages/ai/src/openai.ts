export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }
import type { AgentProviderResponse, AgentToolDescriptor } from './agent';
export interface OpenAIModelInfo { id: string; ownedBy?: string; }
export interface OpenAIModelValidation { model: string; exists: boolean; availableCount: number; }

export const DEFAULT_OPENAI_MODEL = 'gpt-5.6-sol';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

interface ProviderErrorBody { error?: { message?: string; code?: string; param?: string }; message?: string; }

export class OpenAIProvider {
  public id = 'openai';
  private apiKey: string | undefined;
  private baseUrl: string;
  private model: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    this.baseUrl = this.normalizeBaseUrl(opts?.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL);
    this.model = this.normalizeModel(opts?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL);
  }

  configure(opts: { apiKey?: string; baseUrl: string; model: string }): void {
    this.apiKey = opts.apiKey;
    this.baseUrl = this.normalizeBaseUrl(opts.baseUrl);
    this.model = this.normalizeModel(opts.model);
  }

  async isConfigured(): Promise<boolean> { return Boolean(this.apiKey); }

  async listModels(): Promise<OpenAIModelInfo[]> {
    const response = await this.authorizedFetch(`${this.baseUrl}/models`);
    if (!response.ok) throw await this.providerError(response, 'Could not list models');
    const payload = await response.json() as { data?: Array<{ id?: unknown; owned_by?: unknown }> };
    if (!Array.isArray(payload.data)) throw new Error('The AI provider returned an invalid model list. You can still enter a model ID manually.');
    return payload.data
      .filter((model): model is { id: string; owned_by?: unknown } => typeof model.id === 'string' && Boolean(model.id.trim()))
      .map((model) => ({ id: model.id, ownedBy: typeof model.owned_by === 'string' ? model.owned_by : undefined }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async validateModel(model = this.model): Promise<OpenAIModelValidation> {
    const normalized = this.normalizeModel(model);
    const models = await this.listModels();
    return { model: normalized, exists: models.some((entry) => entry.id === normalized), availableCount: models.length };
  }

  async testConnection(): Promise<OpenAIModelValidation> {
    const validation = await this.validateModel();
    if (!validation.exists) {
      throw new Error(`The saved model "${validation.model}" is not available to this API key. Choose another model or refresh the provider model list.`);
    }
    return validation;
  }

  async chat(messages: ChatMessage[], model = this.model): Promise<string> {
    const selectedModel = this.normalizeModel(model);
    const request = {
      model: selectedModel,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      max_completion_tokens: 1_600
    };
    let response = await this.authorizedFetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.clone().text();
      if (response.status === 400 && /max_completion_tokens|unknown parameter|unsupported parameter/i.test(errorText)) {
        const { max_completion_tokens: _ignored, ...compatibleRequest } = request;
        response = await this.authorizedFetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...compatibleRequest, max_tokens: 1_600 })
        });
      }
    }

    if (!response.ok) throw await this.providerError(response, `AI request failed for model "${selectedModel}"`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: unknown }; text?: unknown }> };
    const choice = data.choices?.[0];
    if (!choice) return '';
    return typeof choice.message?.content === 'string' ? choice.message.content : String(choice.text ?? '');
  }

  async chatWithTools(messages: ChatMessage[], tools: AgentToolDescriptor[], model = this.model): Promise<AgentProviderResponse> {
    const selectedModel = this.normalizeModel(model);
    const providerNames = new Map<string, string>();
    const providerTools = tools.map((tool, index) => {
      const alias = `forge_${index}_${tool.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      providerNames.set(alias, tool.name);
      return { type: 'function', function: { name: alias, description: `${tool.description} (FORGE tool: ${tool.name})`, parameters: tool.parameters } };
    });
    const request = {
      model: selectedModel,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      tools: providerTools,
      tool_choice: 'auto',
      max_completion_tokens: 1_600
    };
    const response = await this.authorizedFetch(`${this.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
    if (!response.ok) throw await this.providerError(response, `AI request failed for model "${selectedModel}"`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown[] } }> };
    const message = data.choices?.[0]?.message;
    const toolCalls = (message?.tool_calls ?? []).map((raw) => {
      const call = raw as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
      if (typeof call.function?.name !== 'string' || typeof call.function.arguments !== 'string') throw new Error('The provider returned a malformed tool call.');
      let args: unknown; try { args = JSON.parse(call.function.arguments); } catch { throw new Error('The provider returned malformed tool arguments.'); }
      return { id: typeof call.id === 'string' ? call.id : crypto.randomUUID(), name: providerNames.get(call.function.name) ?? call.function.name, arguments: args, provider: this.id };
    });
    return { content: typeof message?.content === 'string' ? message.content : '', toolCalls, modelId: selectedModel };
  }

  private async authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    if (!this.apiKey) throw new Error('OpenAI API key is not configured.');
    return fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${this.apiKey}` }
    });
  }

  private async providerError(response: Response, prefix: string): Promise<Error> {
    const text = await response.text();
    let detail = text;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(text) as ProviderErrorBody;
      detail = parsed.error?.message ?? parsed.message ?? text;
      code = parsed.error?.code;
    } catch { /* non-JSON compatible providers are allowed */ }
    if (response.status === 404 || code === 'model_not_found' || /model.+(?:not found|does not exist|not available)/i.test(detail)) {
      return new Error(`${prefix}: the model is unsupported or unavailable for this provider. Refresh models in Settings or enter a different model ID.`);
    }
    return new Error(`${prefix} (${response.status}): ${detail || response.statusText}`);
  }

  private normalizeBaseUrl(value: string): string {
    const normalized = value.trim().replace(/\/$/, '');
    if (!normalized) throw new Error('API base URL is required.');
    const parsed = new URL(normalized);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('API base URL must use HTTPS or HTTP.');
    if (parsed.username || parsed.password) throw new Error('API base URL must not contain credentials.');
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase());
    if (parsed.protocol === 'http:' && !loopback) throw new Error('Remote API base URLs must use HTTPS. HTTP is allowed only for loopback providers.');
    return parsed.toString().replace(/\/$/, '');
  }

  private normalizeModel(value: string): string {
    const normalized = value.trim();
    if (!normalized) throw new Error('AI model ID is required.');
    return normalized;
  }
}

export default OpenAIProvider;
