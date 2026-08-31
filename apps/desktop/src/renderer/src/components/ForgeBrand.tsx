import type { JSX } from 'react';
import brandMark from '../assets/brand/forge-v2.5-mark.png';

export default function ForgeBrand({ compact = false }: { compact?: boolean }): JSX.Element {
  return <span className={`forge-brand ${compact ? 'compact' : ''}`}><img src={brandMark} alt="" /><span className="forge-wordmark">FORGE</span>{!compact && <span className="forge-version-mark">2.5</span>}</span>;
}
