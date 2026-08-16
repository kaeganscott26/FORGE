import { useEffect, useState, type JSX } from 'react';
import type { DesktopApplication, ForgeOsContext, SystemOverview } from '@forge/ipc';
import { forgeInvoke } from '../forge';
const call = async <T,>(promise: Promise<any>): Promise<T> => { const result = await promise; if (!result.success) throw new Error(result.error?.message || 'Request failed.'); return result.data; };
const bytes = (value: number): string => `${(value / 1024 ** 3).toFixed(1)} GB`;
type RecoveryContext = ForgeOsContext & { recoveryMode?: boolean; liveRecoveryMode?: boolean };
export default function ForgeOsShell(): JSX.Element | null {
  const [context, setContext] = useState<RecoveryContext | null>(null); const [applications, setApplications] = useState<DesktopApplication[]>([]);
  const [applicationsOpen, setApplicationsOpen] = useState(false); const [systemOpen, setSystemOpen] = useState(false); const [powerOpen, setPowerOpen] = useState(false); const [overview, setOverview] = useState<SystemOverview | null>(null); const [now, setNow] = useState(new Date()); const [error, setError] = useState('');
  useEffect(() => { void call<ForgeOsContext>(forgeInvoke('forge-os.context', undefined)).then((value) => setContext(value as RecoveryContext)).catch(() => undefined); }, []);
  useEffect(() => { if (!context?.shellMode) return; void call<DesktopApplication[]>(forgeInvoke('forge-os.applications', undefined)).then(setApplications).catch((cause) => setError(String(cause))); const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, [context?.shellMode]);
  if (!context?.shellMode) return null;
  const action = async (next: 'lock' | 'logout' | 'restart' | 'shutdown'): Promise<void> => { if ((next === 'restart' || next === 'shutdown') && !window.confirm(`${next === 'restart' ? 'Restart' : 'Shut down'} this machine?`)) return; try { await call(forgeInvoke('forge-os.session.action', { action: next })); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const launchApplication = async (id: string): Promise<void> => { try { await call(forgeInvoke('forge-os.application.launch', { id })); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };

  if (context.liveRecoveryMode) {
    const rootShellReady = applications.some((application) => application.id === 'forge-live-root-shell.desktop');
    const installerReady = applications.some((application) => application.id === 'forge-live-installer.desktop');
    return <section style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', background: 'rgba(5, 8, 10, 0.97)', color: '#f2f7f5', padding: 32 }}>
      <div style={{ width: 'min(860px, 92vw)', border: '1px solid rgba(70, 255, 150, 0.45)', borderRadius: 16, padding: 28, background: 'rgba(12, 18, 20, 0.96)', boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
        <header style={{ marginBottom: 24 }}><small style={{ letterSpacing: '.18em', color: '#74f5a7' }}>FORGE-OS · LIVE ENVIRONMENT</small><h1 style={{ margin: '8px 0 10px' }}>FORGE Live Recovery</h1><p style={{ margin: 0, opacity: .82, lineHeight: 1.5 }}>This is the ephemeral recovery and provisioning workspace. The installed system is not modified until you explicitly run a privileged command or installer.</p></header>
        {error && <div style={{ marginBottom: 18, padding: 12, border: '1px solid #b85858', borderRadius: 8 }}>{error} <button onClick={() => setError('')}>Dismiss</button></div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <button disabled={!rootShellReady} onClick={() => void launchApplication('forge-live-root-shell.desktop')} style={{ padding: 18, textAlign: 'left' }}><strong>Open sudo root shell</strong><br/><small>Launch Konsole directly into an explicitly privileged live shell.</small></button>
          <button disabled={!installerReady} onClick={() => void launchApplication('forge-live-installer.desktop')} style={{ padding: 18, textAlign: 'left' }}><strong>Load / install ISO or ZIP</strong><br/><small>Select a local installer bundle. FORGE validates the file type and requires a second INSTALL confirmation before running a recognized installer.</small></button>
          <button onClick={() => void action('restart')} style={{ padding: 18, textAlign: 'left' }}><strong>Restart machine</strong><br/><small>Leave the recovery environment and reboot.</small></button>
          <button onClick={() => void action('shutdown')} style={{ padding: 18, textAlign: 'left' }}><strong>Shut down</strong><br/><small>Power off without changing the installed system.</small></button>
        </div>
        <footer style={{ marginTop: 22, opacity: .68, fontSize: 13 }}>Live sudo is passwordless only for the ephemeral <code>forge</code> account. ISO/ZIP automation only runs recognized installer entry points; everything else remains available for manual inspection from the root shell.</footer>
      </div>
    </section>;
  }

  return <><div className="forge-os-bar"><button className="forge-os-apps-button" onClick={() => { setApplicationsOpen(!applicationsOpen); setPowerOpen(false); setSystemOpen(false); }}>Applications</button><button onClick={() => { setSystemOpen(!systemOpen); setApplicationsOpen(false); setPowerOpen(false); if (!overview) void call<SystemOverview>(forgeInvoke('forge-os.overview', undefined)).then(setOverview).catch((cause) => setError(String(cause))); }}>System</button><span className="forge-os-spacer"/><time>{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time><button onClick={() => { setPowerOpen(!powerOpen); setApplicationsOpen(false); setSystemOpen(false); }}>Session</button></div>
    {error && <div className="forge-os-error">{error}<button onClick={() => setError('')}>×</button></div>}
    {applicationsOpen && <section className="forge-os-popover forge-os-applications"><header><strong>Applications</strong><span>{applications.length} installed</span></header>{applications.map((application) => <button key={application.id} onClick={() => { void launchApplication(application.id); setApplicationsOpen(false); }}><b>{application.name}</b><small>{application.description || application.categories[0] || 'Application'}</small></button>)}</section>}
    {systemOpen && <section className="forge-os-popover forge-os-system"><header><strong>System Overview</strong></header>{overview ? <dl><dt>Hostname</dt><dd>{overview.hostname}</dd><dt>OS</dt><dd>{overview.os}</dd><dt>Kernel</dt><dd>{overview.kernel}</dd><dt>CPU</dt><dd>{overview.cpu}</dd><dt>Memory</dt><dd>{bytes(overview.memoryBytes)}</dd><dt>Storage free</dt><dd>{bytes(overview.storage.freeBytes)} / {bytes(overview.storage.totalBytes)}</dd><dt>FORGE</dt><dd>{overview.forgeVersion}</dd><dt>FORGE-OS</dt><dd>{overview.forgeOsVersion}</dd><dt>Session</dt><dd>{overview.sessionType}</dd></dl> : <p>Reading system state…</p>}<footer>Network · Audio · Display · Power · Applications · Storage · Appearance · Updates · Security · Recovery · Advanced</footer></section>}
    {powerOpen && <section className="forge-os-popover forge-os-session"><button onClick={() => void action('lock')}>Lock</button><button onClick={() => void action('logout')}>Log out</button><button onClick={() => void action('restart')}>Restart</button><button onClick={() => void action('shutdown')}>Shut down</button><p>Recovery: use Ctrl+Alt+F2 for a console.</p></section>}</>;
}
