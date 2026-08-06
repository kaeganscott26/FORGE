export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export class OpenAIProvider {
  public id = 'openai';
  private apiKey: string | undefined;
  private baseUrl: string;
  private model: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    this.baseUrl = opts?.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    this.model = opts?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o';
  }

  configure(opts: { apiKey?: string; baseUrl: string; model: string }): void {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl;
    this.model = opts.model;
  }

  async isConfigured(): Promise<boolean> {
    return !!this.apiKey;
  }

  async testConnection(): Promise<void> {
    if (!this.apiKey) throw new Error('OpenAI API key is not configured.');
    const response = await fetch(`${this.baseUrl}/models`, { headers: { Authorization: `Bearer ${this.apiKey}` } });
    if (!response.ok) throw new Error(`AI provider authentication failed (${response.status}).`);
  }

  /**
   * Send a chat request to OpenAI Chat Completions. Returns the assistant text.
   */
  async chat(messages: ChatMessage[], model = this.model): Promise<string> {
    if (!this.apiKey) throw new Error('OpenAI API key is not configured.');
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 800,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${text}`);
    }
    const data = await res.json();
    // Navigation: prefer message content from choices[0].message.content
    const choice = data.choices && data.choices[0];
    if (!choice) return '';
    return (choice.message && choice.message.content) || String(choice.text || '');
  }
}

export default OpenAIProvider;
