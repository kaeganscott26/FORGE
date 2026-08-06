import type { MemoryEntry, MemoryRetriever } from '@forge/memory';
import type { ContextAssemblyResult } from './intelligence';

export interface AgentMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export interface SimpleAIProvider {
  id: string;
  isConfigured(): Promise<boolean>;
  chat(messages: AgentMessage[], model?: string): Promise<string>;
}

export interface AgentTurnResult {
  content: string;
  memories: MemoryEntry[];
  context: ContextAssemblyResult;
}

export class Agent {
  constructor(
    private provider: SimpleAIProvider,
    private contextBuilder: { assemble(query: string, memories?: MemoryEntry[] | null): Promise<ContextAssemblyResult> },
    private memoryRetriever?: MemoryRetriever
  ) {}

  async askWithContext(question: string, history: readonly AgentMessage[] = []): Promise<AgentTurnResult> {
    let memories: MemoryEntry[] = [];
    if (this.memoryRetriever) {
      try { memories = await this.memoryRetriever.search(question, 6); }
      catch { memories = []; }
    }
    const context = await this.contextBuilder.assemble(question, memories);
    const boundedHistory = history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-24)
      .reduceRight<AgentMessage[]>((selected, message) => {
        const used = selected.reduce((total, entry) => total + entry.content.length, 0);
        return used >= 12_000 ? selected : [{ role: message.role, content: message.content.slice(0, 3_000) }, ...selected];
      }, []);
    const messages: AgentMessage[] = [
      { role: 'system', content: context.systemPrompt },
      ...boundedHistory,
      { role: 'user', content: question }
    ];
    return { content: await this.provider.chat(messages), memories, context };
  }

  async ask(question: string, history: readonly AgentMessage[] = []): Promise<string> {
    return (await this.askWithContext(question, history)).content;
  }

  async explainProject(history: readonly AgentMessage[] = []): Promise<string> {
    return this.ask('Explain this repository as an evidence-grounded architecture summary.', history);
  }

  async reviewChanges(history: readonly AgentMessage[] = []): Promise<string> {
    return this.ask('Review the current repository changes against its documented architecture and project goals.', history);
  }
}

export default Agent;
