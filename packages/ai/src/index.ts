export interface AIProvider {
	id: string;
	/** Return whether this provider is configured and ready to use */
	isConfigured(): Promise<boolean>;
}

export interface ContextBuilder {
  assemble(query: string): Promise<import('./intelligence').ContextAssemblyResult>;
}

export { DEFAULT_OPENAI_MODEL, OpenAIProvider } from './openai';
export { ContextBuilderImpl } from './context';
export { Agent, type AgentMessage, type AgentTurnResult, type AgentToolTurnResult, type AgentToolDescriptor, type AgentProviderResponse } from './agent';
export * from './intelligence';
