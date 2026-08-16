import { useEffect, useState, type JSX } from 'react';
import type { DesktopApplication, ForgeOsContext, SystemOverview } from '@forge/ipc';
import { forgeInvoke } from '../forge';
const call = async <T,>(promise: Promise<any>): Promise<T> => { const result = await promise; if (!result.success) throw new Error(result.error?.message || 'Request failed.'); return result.data; };
const bytes = (value: number): string => `${(value / 1024 ** 3).toFixed(1)} GB`;
type RecoveryContext = ForgeOsContext & { recoveryMode?: boolean; liveRecoveryMode?: boolean };
const systemSurfaces = [
  ['Network', 'network'], ['Audio', 'audio'], ['Display', 'display'], ['Power', 'power'], ['Applications', 'applications'],
  ['Storage', 'storage'], ['Appearance', 'appearance'], ['Updates', 'updates'], ['Security', 'security'], ['Recovery', 'recovery'], ['Advanced', 'advanced']
] as const;
const sessionApplications = {
  lock: 'forge-internal-session-lock.desktop',
  logout: 'forge-internal-session-logout.desktop',
  restart: 'forge-internal-session-restart.desktop',
  shutdown: 'forge-internal-session-shutdown.desktop'
} as const;
export default function ForgeOsShell(): JSX.Element | null {
  const [context, setContext] = useState<RecoveryContext | null>(null); const [applications, setApplications] = useState<DesktopApplication[]>([]);
  const [applicationsOpen, setApplicationsOpen] = useState(false); const [systemOpen, setSystemOpen] = useState(false); const [powerOpen, setPowerOpen] = useState(false); const [overview, setOverview] = useState<SystemOverview | null>(null); const [now, setNow] = useState(new Date()); const [error, setError] = useState('');
  useEffect(() => { void call<ForgeOsContext>(forgeInvoke('forge-os.context', undefined)).then((value) => setContext(value as RecoveryContext)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!context?.shellMode) return undefined;
    document.body.classList.add('forge-os-shell-active');
    return () => document.body.classList.remove('forge-os-shell-active');
  }, [context?.shellMode]);
  useEffect(() => { if (!context?.shellMode) return; void call<DesktopApplication[]>(forgeInvoke('forge-os.applications', undefined)).then(setApplications).catch((cause) => setError(String(cause))); const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, [context?.shellMode]);
  if (!context?.shellMode) return null;
  const launchApplication = async (id: string): Promise<void> => { try { await call(forgeInvoke('forge-os.application.launch', { id })); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const launchSurface = (surface: typeof systemSurfaces[number][1]): void => { setApplicationsOpen(false); setSystemOpen(false); setPowerOpen(false); void launchApplication(`forge-internal-${surface}.desktop`); };
  const sessionAction = (next: keyof typeof sessionApplications): void => {
    if ((next === 'restart' || next === 'shutdown') && !window.confirm(`${next === 'restart' ? 'Restart' : 'Shut down'} this machine?`)) return;
    setPowerOpen(false); void launchApplication(sessionApplications[next]);
  };

  if (context.liveRecoveryMode) {
    const setupReady = applications.some((application) => application.id === 'forge-live-setup.desktop');
    const rootShellReady = applications.some((application) => application.id === 'forge-live-root-shell.desktop');
    const installerReady = applications.some((application) => application.id === 'forge-live-installer.desktop');
    const cleanInstallReady = applications.some((application) => application.id === 'forge-live-clean-install.desktop');
    return <section className="forge-live-recovery">
      <div className="forge-live-recovery-card">
        <header><small>FORGE-OS · LIVE ENVIRONMENT</small><h1>Setup & Recovery</h1><p>FORGE-OS is running inside the normal KWin Wayland compositor. The guided setup opens as native KDE/Qt windows using the same FORGE Dark system theme, while this live workspace remains available underneath.</p></header>
        {error && <div className="forge-live-recovery-error">{error} <button onClick={() => setError('')}>Dismiss</button></div>}
        <div className="forge-live-recovery-grid">
          <button disabled={!setupReady} onClick={() => void launchApplication('forge-live-setup.desktop')}><strong>Open Guided Setup</strong><small>Partition with KDE tools, choose install options, then install the embedded verified FORGE-OS build to your mounted target.</small></button>
          <button disabled={!rootShellReady} onClick={() => void launchApplication('forge-live-root-shell.desktop')}><strong>Open sudo root shell</strong><small>Launch an unrestricted administrator shell in the disposable live environment.</small></button>
          <button disabled={!cleanInstallReady} onClick={() => void launchApplication('forge-live-clean-install.desktop')}><strong>Direct clean installer</strong><small>Advanced path for an already partitioned, formatted, and mounted target. It never partitions or formats for you.</small></button>
          <button disabled={!installerReady} onClick={() => void launchApplication('forge-live-installer.desktop')}><strong>Load / install ISO or ZIP</strong><small>Select a separate local installer bundle and confirm before execution.</small></button>
          <button onClick={() => sessionAction('restart')}><strong>Restart machine</strong><small>Boot the installed system after setup completes.</small></button>
          <button onClick={() => sessionAction('shutdown')}><strong>Shut down</strong><small>Power off without changing the installed system.</small></button>
        </div>
        <footer>Guided Setup opens automatically once per live boot. Required boot/network/audio/firewall/greetd services are always installed; optional services are selected in the setup checklist and verified again by the installed first-boot service.</footer>
      </div>
    </section>;
  }

  return <>
    <div className="forge-os-bar" role="navigation" aria-label="FORGE OS controls">
      <div className="forge-os-primary-actions">
        <button className="forge-os-apps-button" onClick={() => { setApplicationsOpen(!applicationsOpen); setPowerOpen(false); setSystemOpen(false); }}>Applications</button>
        <button onClick={() => { setSystemOpen(!systemOpen); setApplicationsOpen(false); setPowerOpen(false); if (!overview) void call<SystemOverview>(forgeInvoke('forge-os.overview', undefined)).then(setOverview).catch((cause) => setError(String(cause))); }}>System</button>
      </div>
      <nav className="forge-os-quick-actions" aria-label="System settings">
        {systemSurfaces.map(([label, surface]) => <button key={surface} title={`Open ${label}`} onClick={() => launchSurface(surface)}>{label}</button>)}
      </nav>
      <div className="forge-os-status-actions">
        <time>{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>
        <button onClick={() => { setPowerOpen(!powerOpen); setApplicationsOpen(false); setSystemOpen(false); }}>Session</button>
      </div>
    </div>
    {error && <div className="forge-os-error">{error}<button onClick={() => setError('')}>×</button></div>}
    {applicationsOpen && <section className="forge-os-popover forge-os-applications"><header><strong>Applications</strong><span>{applications.length} installed</span></header>{applications.map((application) => <button key={application.id} onClick={() => { void launchApplication(application.id); setApplicationsOpen(false); }}><b>{application.name}</b><small>{application.description || application.categories[0] || 'Application'}</small></button>)}</section>}
    {systemOpen && <section className="forge-os-popover forge-os-system"><header><strong>System Overview</strong></header>{overview ? <dl><dt>Hostname</dt><dd>{overview.hostname}</dd><dt>OS</dt><dd>{overview.os}</dd><dt>Kernel</dt><dd>{overview.kernel}</dd><dt>CPU</dt><dd>{overview.cpu}</dd><dt>Memory</dt><dd>{bytes(overview.memoryBytes)}</dd><dt>Storage free</dt><dd>{bytes(overview.storage.freeBytes)} / {bytes(overview.storage.totalBytes)}</dd><dt>FORGE</dt><dd>{overview.forgeVersion}</dd><dt>FORGE-OS</dt><dd>{overview.forgeOsVersion}</dd><dt>Session</dt><dd>{overview.sessionType}</dd></dl> : <p>Reading system state…</p>}<footer>{systemSurfaces.map(([label, surface]) => <button key={surface} onClick={() => launchSurface(surface)}>{label}</button>)}</footer></section>}
    {powerOpen && <section className="forge-os-popover forge-os-session"><button onClick={() => sessionAction('lock')}>Lock</button><button onClick={() => sessionAction('logout')}>Log out</button><button onClick={() => sessionAction('restart')}>Restart</button><button onClick={() => sessionAction('shutdown')}>Shut down</button><p>Recovery: Ctrl+Alt+F2 opens the dedicated recovery profile.</p></section>}
  </>;
}
