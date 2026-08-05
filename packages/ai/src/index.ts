export interface AIProvider { id: string; isConfigured(): Promise<boolean>; }
export interface ContextBuilder { assemble(query: string): Promise<{ text: string; rationale: string }>; }

