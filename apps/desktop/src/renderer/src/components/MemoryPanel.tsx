import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import type { WorkspaceKnowledgeRecord } from '@forge/ipc';
import { forgeInvoke } from '../forge';

type KnowledgeGroup = { id: string; label: string; description: string; open: boolean; records: WorkspaceKnowledgeRecord[] };

const metadataFor = (record: WorkspaceKnowledgeRecord): Record<string, unknown> => typeof record.metadata === 'object' && record.metadata ? record.metadata as Record<string, unknown> : {};
const isIndexed = (record: WorkspaceKnowledgeRecord): boolean => metadataFor(record).origin === 'workspace-index' || (['document', 'code'].includes(record.type) && typeof metadataFor(record).path === 'string');
const isHiddenMachineConfiguration = (record: WorkspaceKnowledgeRecord): boolean => isIndexed(record) && /(?:^|\/)\.obsidian(?:\/|$)/i.test(String(metadataFor(record).path ?? ''));

function groupFor(record: WorkspaceKnowledgeRecord): Omit<KnowledgeGroup, 'records'> {
  const metadata = metadataFor(record);
  const classification = String(metadata.classification ?? '').toLowerCase();
  const sourcePath = String(metadata.path ?? '').toLowerCase();
  if (classification === 'architecture' || /(?:^|\/)(?:readme|architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes).*\.md$/i.test(sourcePath)) return { id: 'architecture', label: 'Architecture', description: 'Intent, status, architecture, and durable project direction', open: true };
  if (classification === 'documentation' || /\.md$/i.test(sourcePath)) return { id: 'documentation', label: 'Documentation', description: 'Human-authored project guides and notes', open: true };
  if (classification === 'configuration' || /(?:\.json|\.ya?ml|(?:^|\/)\w+\.config\.[^/]+)$/i.test(sourcePath)) return { id: 'configuration', label: 'Configuration', description: 'Build, tooling, and project configuration', open: false };
  if (classification === 'source') return { id: 'source', label: 'Source Code', description: 'Current implementation evidence', open: false };
  switch (record.type) {
    case 'architecture': return { id: 'architecture', label: 'Architecture', description: 'Intent, status, architecture, and durable project direction', open: true };
    case 'documentation':
    case 'document': return { id: 'documentation', label: 'Documentation', description: 'Human-authored project guides and notes', open: true };
    case 'source':
    case 'code': return { id: 'source', label: 'Source Code', description: 'Current implementation evidence', open: false };
    case 'configuration': return { id: 'configuration', label: 'Configuration', description: 'Build, tooling, and project configuration', open: false };
    default: return { id: 'memory', label: 'Memory', description: 'Durable decisions, notes, and conversation knowledge', open: true };
  }
}

export default function MemoryPanel({ workspaceKey }: { workspaceKey: string }): JSX.Element {
  const [records, setRecords] = useState<WorkspaceKnowledgeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await forgeInvoke('agent.memories.list', undefined);
      if (!result.success) throw new Error(result.error.message);
      setRecords(result.data as WorkspaceKnowledgeRecord[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { setRecords([]); void refresh(); }, [workspaceKey, refresh]);

  const groups = useMemo(() => {
    const order = ['architecture', 'documentation', 'source', 'memory', 'configuration'];
    const grouped = new Map<string, KnowledgeGroup>();
    for (const record of records.filter((record) => !isHiddenMachineConfiguration(record))) {
      const definition = groupFor(record);
      const group = grouped.get(definition.id) ?? { ...definition, records: [] };
      group.records.push(record);
      grouped.set(definition.id, group);
    }
    return [...grouped.values()].sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id));
  }, [records]);
  const hiddenCount = records.filter(isHiddenMachineConfiguration).length;
  const visibleCount = records.length - hiddenCount;

  const remove = async (record: WorkspaceKnowledgeRecord): Promise<void> => {
    const indexed = isIndexed(record);
    const prompt = indexed
      ? `Remove the indexed knowledge record for ${record.title ?? 'this source'}? The source file will not be changed or deleted. Reindexing can add it again.`
      : `Forget the durable workspace memory ${record.title ?? 'Untitled memory'}? This does not delete any project file.`;
    if (!window.confirm(prompt)) return;
    const result = await forgeInvoke('agent.memories.delete', { id: record.id });
    if (!result.success) { setError(result.error.message); return; }
    await refresh();
  };

  const reindex = async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const result = await forgeInvoke('agent.memories.reindex', undefined);
      if (!result.success) throw new Error(result.error.message);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setLoading(false); }
  };

  return <section className="memory-panel">
    <div className="memory-heading"><div><strong>Workspace knowledge</strong><small>{visibleCount} classified context records{hiddenCount ? ` · ${hiddenCount} machine-config hidden` : ''}</small></div><div><button onClick={() => void refresh()} disabled={loading}>Refresh</button><button onClick={() => void reindex()} disabled={loading}>Reindex</button></div></div>
    <p className="memory-explainer">Indexed records are derived copies for retrieval. Removing one never deletes its source file.</p>
    {error && <p className="inline-error">{error}</p>}
    <div className="memory-list">{groups.length === 0 ? <p className="muted">No workspace knowledge has been indexed.</p> : groups.map((group) => <details className="memory-group" key={group.id} open={group.open}>
      <summary><span><strong>{group.label}</strong><small>{group.description}</small></span><em>{group.records.length}</em></summary>
      {group.records.map((record) => {
        const metadata = metadataFor(record);
        const indexed = isIndexed(record);
        const supportingText = indexed
          ? [typeof metadata.reason === 'string' ? metadata.reason : 'Indexed project evidence.', typeof metadata.path === 'string' ? metadata.path : ''].filter(Boolean).join(' · ')
          : `${record.content.slice(0, 180)}${record.content.length > 180 ? '…' : ''}`;
        return <article key={record.id}><div><strong>{record.title ?? 'Untitled memory'}</strong><p>{supportingText}</p></div><button title={indexed ? 'Removes only FORGE’s indexed copy; the file stays untouched.' : 'Removes this durable memory; project files stay untouched.'} onClick={() => void remove(record)}>{indexed ? 'Remove indexed copy' : 'Forget memory'}</button></article>;
      })}
    </details>)}</div>
  </section>;
}
