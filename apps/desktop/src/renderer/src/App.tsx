import { useCallback, useEffect, useMemo, useState, type CSSProperties, type JSX } from 'react';
import Editor from '@monaco-editor/react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { DEFAULT_WORKSPACE_LAYOUT, type AppUpdateStatus, type DashboardData, type FileNode, type GitDiff, type GitStatus, type WorkspaceInfo, type WorkspaceLayout } from '@forge/ipc';
import { forgeInvoke } from './forge';
import ChatPanel from './components/ChatPanel';
import MemoryPanel from './components/MemoryPanel';
import SettingsModal from './components/SettingsModal';
import TerminalPanel from './components/TerminalPanel';
import ToolPanel from './components/ToolPanel';
import TaskPanel from './components/TaskPanel';

const languageFor = (extension?: string) => ({ md: 'markdown', ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', py: 'python', cpp: 'cpp', c: 'c', css: 'css', html: 'html' }[extension ?? ''] ?? 'plaintext');
const call = async <T,>(promise: Promise<{ success: boolean; data?: T; error?: { message: string } }>): Promise<T> => { const result = await promise; if (!result.success) throw new Error(result.error?.message ?? 'Request failed.'); return result.data as T; };
const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

export default function App(): JSX.Element {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [active, setActive] = useState<FileNode | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [diff, setDiff] = useState<GitDiff | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState<'api' | 'github' | null>(null);
  const [layout, setLayout] = useState<WorkspaceLayout>(DEFAULT_WORKSPACE_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [bottomView, setBottomView] = useState<'source' | 'terminal' | 'actions' | 'tasks'>('source');

  const refresh = useCallback(async () => {
    if (!workspace) return;
    try {
      const [nextFiles, nextStatus, nextDashboard] = await Promise.all([
        call<FileNode[]>(forgeInvoke('file.list', {})),
        call<GitStatus>(forgeInvoke('git.status', undefined)).catch(() => null),
        call<DashboardData>(forgeInvoke('meta.dashboard', undefined))
      ]);
      setFiles(nextFiles); setStatus(nextStatus); setDashboard(nextDashboard);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not refresh workspace.'); }
  }, [workspace]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void call<WorkspaceInfo | null>(forgeInvoke('workspace.info', undefined)).then((info) => { if (info) setWorkspace(info); }).catch(() => undefined); }, []);
  useEffect(() => { void call<AppUpdateStatus>(forgeInvoke('app.update.status', undefined)).then(setUpdateStatus).catch(() => undefined); }, []);
  useEffect(() => {
    if (!updateStatus || !['checking', 'available', 'downloading'].includes(updateStatus.state)) return undefined;
    const timer = window.setInterval(() => { void call<AppUpdateStatus>(forgeInvoke('app.update.status', undefined)).then(setUpdateStatus).catch(() => undefined); }, 1500);
    return () => window.clearInterval(timer);
  }, [updateStatus]);
  useEffect(() => {
    if (!workspace) return;
    setLayoutLoaded(false);
    void call<WorkspaceLayout>(forgeInvoke('workspace.layout.get', undefined)).then((saved) => { setLayout(saved); setLayoutLoaded(true); }).catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); setLayout(DEFAULT_WORKSPACE_LAYOUT); setLayoutLoaded(true); });
  }, [workspace?.rootPath]);
  useEffect(() => {
    if (!workspace || !layoutLoaded) return undefined;
    const timer = window.setTimeout(() => { void call<WorkspaceLayout>(forgeInvoke('workspace.layout.save', layout)).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))); }, 250);
    return () => window.clearTimeout(timer);
  }, [layout, layoutLoaded, workspace]);
  useEffect(() => { void forgeInvoke('editor.dirty.update', { paths: active && content !== savedContent ? [active.relativePath] : [] }); }, [active?.relativePath, content, savedContent]);

  const openWorkspace = async (): Promise<void> => { try { const opened = await call<WorkspaceInfo>(forgeInvoke('workspace.open', undefined)); setWorkspace(opened); setActive(null); setContent(''); setSavedContent(''); setError(null); } catch (cause) { if ((cause as Error).message !== 'Workspace selection was cancelled.') setError((cause as Error).message); } };
  const openFile = async (node: FileNode): Promise<void> => { if (node.type === 'directory') return; try { const file = await call<{ content: string }>(forgeInvoke('file.read', { path: node.relativePath })); setActive(node); setContent(file.content); setSavedContent(file.content); setPreview(node.extension === 'md'); } catch (cause) { setError((cause as Error).message); } };
  const save = async (): Promise<void> => { if (!active) return; try { await call(forgeInvoke('file.write', { path: active.relativePath, content })); setSavedContent(content); await refresh(); } catch (cause) { setError((cause as Error).message); } };
  const createFile = async (): Promise<void> => { const fileName = window.prompt('New relative file path (for example notes/idea.md):'); if (!fileName) return; try { await call(forgeInvoke('file.create', { path: fileName, type: 'file', content: '' })); await refresh(); } catch (cause) { setError((cause as Error).message); } };
  const deleteActive = async (): Promise<void> => { if (!active || !window.confirm(`Delete ${active.relativePath}? This cannot be undone.`)) return; try { await call(forgeInvoke('file.delete', { path: active.relativePath })); setActive(null); setContent(''); await refresh(); } catch (cause) { setError((cause as Error).message); } };
  const createGoal = async (): Promise<void> => { const title = window.prompt('Goal title:'); if (!title) return; try { await call(forgeInvoke('meta.goal.create', { title })); await refresh(); } catch (cause) { setError((cause as Error).message); } };
  const createTask = async (): Promise<void> => { const title = window.prompt('Task title:'); if (!title) return; try { await call(forgeInvoke('meta.task.create', { title })); await refresh(); } catch (cause) { setError((cause as Error).message); } };
  const commit = async (): Promise<void> => { try { await call(forgeInvoke('git.commit', { message: commitMessage })); setCommitMessage(''); await refresh(); } catch (cause) { setError((cause as Error).message); } };
  const stage = async (file: string): Promise<void> => { try { await call(forgeInvoke('git.stage', { files: [file] })); setDiff(await call(forgeInvoke('git.diff', { staged: false }))); await refresh(); } catch (cause) { setError((cause as Error).message); } };
  const checkForUpdates = async (): Promise<void> => { try { setCheckingUpdate(true); const result = await call<AppUpdateStatus>(forgeInvoke('app.update.check', undefined)); setUpdateStatus(result); if (['error', 'development', 'not-available'].includes(result.state)) setError(result.message); } catch (cause) { setError((cause as Error).message); } finally { setCheckingUpdate(false); } };
  const installUpdate = async (): Promise<void> => { try { await call(forgeInvoke('app.update.install', undefined)); } catch (cause) { setError((cause as Error).message); } };
  const renderMarkdown = useMemo(() => ({ __html: DOMPurify.sanitize(marked.parse(content) as string) }), [content]);
  const gridStyle = { '--explorer-width': `${layout.explorerWidth}px`, '--intelligence-width': `${layout.intelligenceWidth}px`, '--bottom-height': `${layout.bottomHeight}px`, '--context-height': `${layout.contextHeight}px` } as CSSProperties;

  return <main className="app-shell">
    <header className="app-header"><div className="brand"><span>F</span> FORGE <small>v{updateStatus?.currentVersion ?? '1.1.0-alpha.3-dev'} · {workspace?.name ?? 'No workspace'}</small></div><div className="toolbar">{updateStatus?.state === 'downloaded' ? <button className="update-ready" onClick={installUpdate}>Restart to update</button> : <button onClick={checkForUpdates} disabled={checkingUpdate || ['checking', 'available', 'downloading'].includes(updateStatus?.state ?? '')}>{updateStatus?.state === 'available' ? `Preparing v${updateStatus.availableVersion}…` : updateStatus?.state === 'downloading' ? 'Downloading update…' : checkingUpdate || updateStatus?.state === 'checking' ? 'Checking…' : 'Check for updates'}</button>}<button onClick={() => void forgeInvoke('app.release.open', undefined)}>Releases</button><button onClick={() => setSettingsOpen('github')}>GitHub</button><button onClick={() => setSettingsOpen('api')}>Settings</button><button onClick={openWorkspace}>Open workspace</button><button disabled={!workspace} onClick={createFile}>New file</button><button disabled={!active || content === savedContent} onClick={save}>Save</button><button disabled={!active} className="danger" onClick={deleteActive}>Delete</button></div></header>
    {settingsOpen && <SettingsModal initialSection={settingsOpen} onClose={() => setSettingsOpen(null)} />}
    {error && <div className="notice"><span>{error}</span><button onClick={() => setError(null)}>×</button></div>}
    {!workspace ? <section className="welcome"><div><p className="eyebrow">LOCAL-FIRST DEVELOPMENT WORKSPACE</p><h1>Think in files.<br />Build with context.</h1><p>FORGE keeps your notes, source code, Git history, conversations, and durable project memory in one private desktop workspace.</p><button className="primary" onClick={openWorkspace}>Open a project folder</button></div></section> : <section className="workspace-grid" style={gridStyle}>
      <aside className="explorer"><div className="panel-title">EXPLORER <button onClick={refresh}>↻</button></div><FileTree nodes={files} active={active?.relativePath} onOpen={openFile} /></aside>
      <ResizeHandle axis="x" label="Resize Explorer" className="explorer-resizer" onDelta={(delta) => setLayout((current) => ({ ...current, explorerWidth: clamp(current.explorerWidth + delta, 180, Math.min(520, window.innerWidth - current.intelligenceWidth - 430)) }))} />
      <section className="editor-area"><div className="tabbar">{active ? <><span>{active.name}{content !== savedContent ? ' •' : ''}</span><button onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button></> : <span>Choose a file to start</span>}</div>{active ? preview && active.extension === 'md' ? <article className="markdown-preview" dangerouslySetInnerHTML={renderMarkdown} /> : <Editor height="100%" theme="vs-dark" language={languageFor(active.extension)} value={content} onChange={(value) => setContent(value ?? '')} options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 18 } }} /> : <div className="empty-editor">Select a text file from the explorer.<br /><small>Workspace files remain the source of truth.</small></div>}</section>
      <ResizeHandle axis="x" label="Resize workspace intelligence" className="intelligence-resizer" onDelta={(delta) => setLayout((current) => ({ ...current, intelligenceWidth: clamp(current.intelligenceWidth - delta, 300, Math.min(720, window.innerWidth - current.explorerWidth - 430)) }))} />
      <aside className="intelligence-panel">
        <div className="workspace-context"><div className="panel-title">WORKSPACE INTELLIGENCE</div><div className="dashboard-scroll"><div className="health"><strong>{dashboard?.contextHealth.score ?? 0}</strong><span>Context health</span><em>{dashboard?.contextHealth.hasReadme ? 'README found' : 'Add a README'}</em></div><Metric label="Markdown notes" value={dashboard?.contextHealth.noteCount ?? 0} /><Metric label="Code files" value={dashboard?.contextHealth.codeFileCount ?? 0} /><section className="list-section"><div><h3>Goals</h3><button onClick={createGoal}>+</button></div>{dashboard?.project?.goals.length ? dashboard.project.goals.map((goal) => <p key={goal.id}>○ {goal.title}</p>) : <p className="muted">No goals yet.</p>}</section><section className="list-section"><div><h3>Tasks</h3><button onClick={createTask}>+</button></div>{dashboard?.project?.tasks.length ? dashboard.project.tasks.map((task) => <p key={task.id}>□ {task.title}</p>) : <p className="muted">No tasks yet.</p>}</section><section className="list-section"><h3>Recent commits</h3>{dashboard?.recentCommits.length ? dashboard.recentCommits.slice(0, 4).map((entry) => <p key={entry.hash}><code>{entry.shortHash}</code> {entry.message}</p>) : <p className="muted">No commits available.</p>}</section><MemoryPanel workspaceKey={workspace.rootPath} /></div></div>
        <ResizeHandle axis="y" label="Resize context and chat" className="context-resizer" onDelta={(delta) => setLayout((current) => ({ ...current, contextHeight: clamp(current.contextHeight + delta, 160, Math.max(160, window.innerHeight - 52 - current.bottomHeight - 195)) }))} />
        <ChatPanel workspaceKey={workspace.rootPath} />
      </aside>
      <ResizeHandle axis="y" label="Resize source control" className="git-resizer" onDelta={(delta) => setLayout((current) => ({ ...current, bottomHeight: clamp(current.bottomHeight - delta, 150, Math.max(150, window.innerHeight - 357)) }))} />
      <section className="git-panel"><div className="panel-title"><button className={bottomView === 'source' ? 'active-tab' : ''} onClick={() => setBottomView('source')}>SOURCE CONTROL</button><button className={bottomView === 'tasks' ? 'active-tab' : ''} onClick={() => setBottomView('tasks')}>TASKS</button><button className={bottomView === 'terminal' ? 'active-tab' : ''} onClick={() => setBottomView('terminal')}>TERMINAL</button><button className={bottomView === 'actions' ? 'active-tab' : ''} onClick={() => setBottomView('actions')}>AGENT ACTIONS</button><span>{bottomView === 'source' ? status?.branch ?? 'Not a Git repository' : bottomView === 'terminal' ? 'User-entered commands' : bottomView === 'tasks' ? 'Workspace-owned durable execution' : 'Policy-controlled tools'}</span>{bottomView === 'source' && <><button onClick={() => void forgeInvoke('git.pull', undefined).then(refresh)}>Pull</button><button onClick={() => void forgeInvoke('git.push', undefined).then(refresh)}>Push</button></>}</div>{bottomView === 'source' ? <div className="git-content"><div className="changes">{status?.files.length ? status.files.map((file) => <button key={file.path} onClick={() => stage(file.path)}><b>{file.indexStatus}{file.workingStatus}</b>{file.path}</button>) : <p className="muted">Working tree clean.</p>}</div><div className="commit"><input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="Commit message" /><button disabled={!commitMessage.trim()} onClick={commit}>Commit</button></div><pre className="diff">{diff?.files.flatMap((file) => file.lines.map((line) => `${line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '} ${line.content}`)).join('\n') || 'Select a changed file to stage and inspect changes.'}</pre></div> : bottomView === 'tasks' ? <TaskPanel workspaceKey={workspace.rootPath} onOpenAudit={() => setBottomView('actions')} /> : bottomView === 'terminal' ? <TerminalPanel workspaceKey={workspace.rootPath} /> : <ToolPanel workspaceKey={workspace.rootPath} />}</section>
    </section>}
  </main>;
}

function ResizeHandle({ axis, className, label, onDelta }: { axis: 'x' | 'y'; className: string; label: string; onDelta: (delta: number) => void }): JSX.Element {
  const start = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    let previous = axis === 'x' ? event.clientX : event.clientY;
    const move = (pointer: PointerEvent): void => { const next = axis === 'x' ? pointer.clientX : pointer.clientY; onDelta(next - previous); previous = next; };
    const stop = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
      document.body.classList.remove('resizing-x', 'resizing-y');
    };
    document.body.classList.add(axis === 'x' ? 'resizing-x' : 'resizing-y');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
  };
  return <div className={`resize-handle ${axis === 'x' ? 'vertical' : 'horizontal'} ${className}`} role="separator" aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'} aria-label={label} onPointerDown={start} />;
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function FileTree({ nodes, active, onOpen }: { nodes: FileNode[]; active?: string; onOpen: (node: FileNode) => void }): JSX.Element { return <ul className="file-tree">{nodes.map((node) => <li key={node.relativePath}><button className={active === node.relativePath ? 'selected' : ''} onClick={() => onOpen(node)}>{node.type === 'directory' ? '⌄ ' : ''}{node.name}</button>{node.children && <FileTree nodes={node.children} active={active} onOpen={onOpen} />}</li>)}</ul>; }
