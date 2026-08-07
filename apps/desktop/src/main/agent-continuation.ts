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
