export function looksLikeRepeatedToolRequest(content: string): boolean {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!trimmed.startsWith('{')) return false;
  try {
    const value = JSON.parse(trimmed) as { name?: unknown; tool?: unknown; parameters?: unknown; arguments?: unknown };
    return typeof (value.name ?? value.tool) === 'string' && (value.parameters !== undefined || value.arguments !== undefined);
  } catch { return false; }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== 'taskContext')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, stableValue(entry)]));
}

export function toolCallKey(call: { name: string; arguments: unknown }): string {
  return `${call.name}:${JSON.stringify(stableValue(call.arguments))}`;
}

/**
 * Suppresses only a call whose normalized input has already produced an observed
 * result against the same workspace revision. It intentionally has no call-count
 * limit: meaningful work can continue as long as the workspace changes.
 */
export class ProgressAwareLoopGuard {
  private readonly observations = new Map<string, { revision: string; result: string }>();

  shouldRun(call: { name: string; arguments: unknown }, revision: string): boolean {
    return this.observations.get(toolCallKey(call))?.revision !== revision;
  }

  record(call: { name: string; arguments: unknown }, revision: string, result: unknown): void {
    this.observations.set(toolCallKey(call), { revision, result: JSON.stringify(result).slice(0, 16_000) });
  }

  observedResults(): string[] { return [...this.observations.values()].map((entry) => entry.result); }
}
