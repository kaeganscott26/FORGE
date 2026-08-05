export interface AIProvider {
	id: string;
	/** Return whether this provider is configured and ready to use */
	isConfigured(): Promise<boolean>;
}

export interface ContextBuilder {
	assemble(query: string): Promise<{ text: string; rationale: string }>;
}

export { OpenAIProvider } from './openai';
export { ContextBuilderImpl } from './context';

