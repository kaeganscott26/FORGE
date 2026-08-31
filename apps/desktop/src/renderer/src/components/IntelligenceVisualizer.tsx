import type { DashboardData, RuntimeTelemetryView } from '@forge/ipc';
import type { CSSProperties, JSX } from 'react';

const bytes = (value = 0): string => value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(1)} GB` : `${Math.round(value / 1024 ** 2)} MB`;
const boundedPercent = (value: number): number => Math.min(100, Math.max(0, value));

export default function IntelligenceVisualizer({ dashboard, telemetry }: { dashboard: DashboardData | null; telemetry: RuntimeTelemetryView | null }): JSX.Element {
  const context = dashboard?.contextHealth;
  const contextPercent = boundedPercent(((context?.tokensUsed ?? 0) / Math.max(1, context?.tokenBudget ?? 1)) * 100);
  const heapPercent = boundedPercent(((telemetry?.process.heapUsedBytes ?? 0) / Math.max(1, telemetry?.process.heapTotalBytes ?? 1)) * 100);
  const activity = telemetry?.activity;
  const activeProcesses = (activity?.runningTools ?? 0) + (activity?.runningTasks ?? 0) + (activity?.activeTerminals ?? 0);
  const nodeCount = Math.max(3, Math.min(8, (context?.recordsSelected ?? 0) || 3));

  return <section className="intelligence-visual" aria-label="Live AI layer telemetry">
    <div className="intelligence-orbit" style={{ '--context-load': `${contextPercent * 3.6}deg`, '--heap-load': `${heapPercent * 3.6}deg` } as CSSProperties}>
      <div className="intelligence-core"><span>AI</span><small>{activeProcesses ? 'ACTIVE' : 'READY'}</small></div>
      {Array.from({ length: nodeCount }, (_, index) => <i key={index} style={{ '--node': index, '--nodes': nodeCount } as CSSProperties} />)}
    </div>
    <div className="intelligence-readout">
      <span><b>{contextPercent.toFixed(0)}%</b><small>context</small></span>
      <span><b>{telemetry?.semantic.activeRecords ?? 0}</b><small>memories</small></span>
      <span><b>{activeProcesses}</b><small>processes</small></span>
      <span><b>{bytes(telemetry?.process.rssBytes)}</b><small>runtime</small></span>
    </div>
    <div className="process-stream" aria-label="Running process state">
      <span className={activity?.toolsActive ? 'live' : ''}>TOOLS {activity?.runningTools ?? 0}</span>
      <span className={activity?.tasksActive ? 'live' : ''}>TASKS {activity?.runningTasks ?? 0}</span>
      <span className={(activity?.activeTerminals ?? 0) ? 'live' : ''}>TERMINALS {activity?.activeTerminals ?? 0}</span>
      <span className={telemetry?.semantic.state === 'indexing' ? 'live' : ''}>INDEX {telemetry?.semantic.state ?? 'offline'}</span>
    </div>
  </section>;
}
