export interface SearchService { search(query: string): Promise<Array<{ path: string; score: number }>>; }

