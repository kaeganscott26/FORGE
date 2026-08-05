export interface ForgePlugin { id: string; activate(): Promise<void>; deactivate(): Promise<void>; }
