import type { ProjectContext } from './context';
import type { MemoryRetriever, MemoryEntry } from '@forge/memory';

export interface SimpleAIProvider {
  id: string;
  isConfigured(): Promise<boolean>;
  chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, model?: string): Promise<string>;
}

export class Agent {
  constructor(private provider: SimpleAIProvider, private contextBuilder: { buildContext(query?: string, memories?: MemoryEntry[]): Promise<ProjectContext> }, private memoryRetriever?: MemoryRetriever) {}

  private summarizeContext(ctx: ProjectContext): string {
    const parts: string[] = [];
    parts.push(`Project: ${ctx.projectName ?? 'unknown'}`);
    parts.push(`Root: ${ctx.rootPath ?? 'unknown'}`);
    parts.push(`Files: ${ctx.files.length} entries`);
    if (ctx.readme && ctx.readme.content) parts.push(`README: ${ctx.readme.content.slice(0, 512).replace(/\n+/g, ' ')}${ctx.readme.content.length > 512 ? '...' : ''}`);
    if (ctx.packageJson && ctx.packageJson.content) parts.push(`package.json: ${ctx.packageJson.content.slice(0, 512).replace(/\n+/g, ' ')}${ctx.packageJson.content.length > 512 ? '...' : ''}`);
    if (ctx.recentCommits && ctx.recentCommits.length) parts.push(`Recent commits: ${ctx.recentCommits.map((c) => `${c.hash.slice(0, 7)} ${c.message}`).join(' | ')}`);
    return parts.join('\n');
  }

  async ask(question: string): Promise<string> {
    // retrieve memories first
    let memories: MemoryEntry[] = [];
    if (this.memoryRetriever) {
      try { memories = await this.memoryRetriever.search(question, 5); } catch (e) { memories = []; }
    }
    const ctx = await this.contextBuilder.buildContext(question, memories);
    const summary = this.summarizeContext(ctx);
    const prompt = `${question}\n\nContext:\n${summary}`;
    const messages = [{ role: 'system', content: 'You are Forge, an assistant for developer workspaces.' }, { role: 'user', content: prompt }];
    const resp = await this.provider.chat(messages as any);
    return resp;
  }

  async explainProject(): Promise<string> {
    return this.ask('Explain this repository in a concise developer-facing summary.');
  }

  async reviewChanges(): Promise<string> {
    return this.ask('Review the repository changes and summarize what changed or needs attention.');
  }
}

export default Agent;
