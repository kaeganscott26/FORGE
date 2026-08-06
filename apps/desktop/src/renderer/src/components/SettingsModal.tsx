import { useEffect, useRef, useState, type JSX } from 'react';
import type { UserSettings } from '@forge/ipc';
import { forgeInvoke } from '../forge';
import './settings.css';

const getData = async <T,>(channel: Parameters<typeof forgeInvoke>[0], request?: unknown): Promise<T> => {
  const result = await forgeInvoke(channel as any, request);
  if (!result.success) throw new Error(result.error.message);
  return result.data as T;
};

export default function SettingsModal({ onClose, initialSection = 'api' }: { onClose: () => void; initialSection?: 'api' | 'github' }): JSX.Element {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.openai.com/v1');
  const [apiModel, setApiModel] = useState('gpt-4o');
  const [apiKey, setApiKey] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [clearGithubToken, setClearGithubToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiSection = useRef<HTMLElement>(null);
  const githubSection = useRef<HTMLElement>(null);

  useEffect(() => {
    getData<UserSettings>('settings.get').then((value) => {
      setSettings(value); setApiBaseUrl(value.apiBaseUrl); setApiModel(value.apiModel); setGithubUsername(value.githubUsername);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  useEffect(() => {
    if (!settings) return;
    window.requestAnimationFrame(() => (initialSection === 'github' ? githubSection.current : apiSection.current)?.scrollIntoView({ block: 'start' }));
  }, [initialSection, settings]);

  const save = async (): Promise<void> => {
    setBusy(true); setError(null); setMessage(null);
    try {
      const saved = await getData<UserSettings>('settings.save', { apiBaseUrl, apiModel, apiKey, clearApiKey, githubUsername, githubToken, clearGithubToken });
      setSettings(saved); setApiKey(''); setGithubToken(''); setClearApiKey(false); setClearGithubToken(false); setMessage('Settings saved securely.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };

  const testApi = async (): Promise<void> => {
    setBusy(true); setError(null); setMessage(null);
    try { await getData('settings.test.api'); setMessage('AI provider connection succeeded.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };

  const testGithub = async (): Promise<void> => {
    setBusy(true); setError(null); setMessage(null);
    try { const result = await getData<{ login: string }>('settings.test.github'); setMessage(`GitHub connected as ${result.login}.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };

  return <div className="settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header className="settings-heading"><div><p>FORGE CONFIGURATION</p><h2 id="settings-title">Settings</h2></div><button onClick={onClose} aria-label="Close settings">×</button></header>
      {!settings ? <div className="settings-loading">Loading secure settings…</div> : <div className="settings-body">
        {!settings.secureStorageAvailable && <div className="settings-warning">OS secure storage is unavailable. FORGE will not save new secrets.</div>}
        <section className="settings-section" ref={apiSection}>
          <div className="settings-section-title"><div><span>AI ASSISTANT</span><h3>API integration</h3></div><em className={settings.apiKeyConfigured ? 'configured' : ''}>{settings.apiKeyConfigured ? 'Key saved' : 'Not configured'}</em></div>
          <label>API base URL<input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" /></label>
          <label>Model<input value={apiModel} onChange={(event) => setApiModel(event.target.value)} placeholder="gpt-4o" /></label>
          <label>API key<input type="password" autoComplete="off" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setClearApiKey(false); }} placeholder={settings.apiKeyConfigured ? 'Saved — enter a new key to replace it' : 'Enter API key'} /></label>
          {settings.apiKeyConfigured && <button className="settings-link danger" onClick={() => { setClearApiKey(true); setApiKey(''); }}>Remove saved API key</button>}
          <button onClick={testApi} disabled={busy || !settings.apiKeyConfigured}>Test saved API connection</button>
        </section>

        <section className="settings-section" ref={githubSection}>
          <div className="settings-section-title"><div><span>GITHUB</span><h3>Repository integration</h3></div><em className={settings.githubTokenConfigured ? 'configured' : ''}>{settings.githubTokenConfigured ? 'Token saved' : 'Not configured'}</em></div>
          <p className="settings-help">Use a fine-grained personal access token with Contents read/write access for the repositories you want FORGE to pull and push. The token is never written into a Git remote URL.</p>
          <label>GitHub username<input value={githubUsername} onChange={(event) => setGithubUsername(event.target.value)} placeholder="GitHub username" /></label>
          <label>Personal access token<input type="password" autoComplete="off" value={githubToken} onChange={(event) => { setGithubToken(event.target.value); setClearGithubToken(false); }} placeholder={settings.githubTokenConfigured ? 'Saved — enter a new token to replace it' : 'github_pat_…'} /></label>
          {settings.githubTokenConfigured && <button className="settings-link danger" onClick={() => { setClearGithubToken(true); setGithubToken(''); }}>Remove saved GitHub token</button>}
          <button onClick={testGithub} disabled={busy || !settings.githubTokenConfigured}>Test saved GitHub connection</button>
        </section>

        {message && <div className="settings-message success">{message}</div>}
        {error && <div className="settings-message error">{error}</div>}
      </div>}
      <footer className="settings-footer"><span>Secrets are encrypted with macOS Keychain-backed storage.</span><div><button onClick={onClose}>Cancel</button><button className="primary" disabled={busy || !settings} onClick={save}>{busy ? 'Working…' : 'Save settings'}</button></div></footer>
    </section>
  </div>;
}
