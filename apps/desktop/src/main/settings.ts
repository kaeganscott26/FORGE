import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { normalizeUpdateChannel, type SettingsSaveRequest, type UserSettings } from '@forge/ipc';
import { DEFAULT_OPENAI_MODEL } from '@forge/ai';

interface StoredSettings {
  apiBaseUrl?: string;
  apiModel?: string;
  apiKey?: string;
  githubUsername?: string;
  githubToken?: string;
  webResearchEnabled?: boolean;
  updateChannel?: 'stable' | 'beta' | 'preview';
}

export interface GitHubCredentials {
  username: string;
  token: string;
  askPassPath: string;
}

const defaultBaseUrl = 'https://api.openai.com/v1';

export class SettingsService {
  private data: StoredSettings = {};
  private settingsPath = '';
  private askPassPath = '';
  private encryptionAvailable = false;

  async init(): Promise<void> {
    const userDataPath = app.getPath('userData');
    this.settingsPath = join(userDataPath, 'settings.json');
    this.askPassPath = join(userDataPath, 'forge-git-askpass.sh');
    await fs.mkdir(userDataPath, { recursive: true });
    this.data = await fs.readFile(this.settingsPath, 'utf8').then((text) => JSON.parse(text) as StoredSettings).catch(() => ({}));
    this.encryptionAvailable = await safeStorage.isAsyncEncryptionAvailable();
    await fs.writeFile(this.askPassPath, '#!/bin/sh\ncase "$1" in\n  *Username*) printf "%s" "$FORGE_GITHUB_USERNAME" ;;\n  *Password*) printf "%s" "$FORGE_GITHUB_TOKEN" ;;\n  *) printf "%s" "" ;;\nesac\n', { mode: 0o700 });
    await fs.chmod(this.askPassPath, 0o700);
  }

  publicSettings(): UserSettings {
    return {
      apiBaseUrl: this.data.apiBaseUrl ?? process.env.OPENAI_BASE_URL ?? defaultBaseUrl,
      apiModel: this.data.apiModel ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      apiKeyConfigured: Boolean(this.data.apiKey || process.env.OPENAI_API_KEY),
      githubUsername: this.data.githubUsername ?? '',
      githubTokenConfigured: Boolean(this.data.githubToken),
      secureStorageAvailable: this.encryptionAvailable
      , webResearchEnabled: this.data.webResearchEnabled === true
      , updateChannel: normalizeUpdateChannel(this.data.updateChannel)
    };
  }

  async save(request: SettingsSaveRequest): Promise<UserSettings> {
    this.data.apiBaseUrl = this.validateUrl(request.apiBaseUrl || defaultBaseUrl);
    this.data.apiModel = request.apiModel.trim() || DEFAULT_OPENAI_MODEL;
    this.data.githubUsername = request.githubUsername.trim();
    this.data.webResearchEnabled = request.webResearchEnabled === true;
    this.data.updateChannel = normalizeUpdateChannel(request.updateChannel);

    if (request.clearApiKey) delete this.data.apiKey;
    else if (request.apiKey?.trim()) this.data.apiKey = await this.encrypt(request.apiKey.trim());

    if (request.clearGithubToken) delete this.data.githubToken;
    else if (request.githubToken?.trim()) this.data.githubToken = await this.encrypt(request.githubToken.trim());

    const temporaryPath = `${this.settingsPath}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(this.data, null, 2)}\n`, { mode: 0o600 });
    await fs.rename(temporaryPath, this.settingsPath);
    await fs.chmod(this.settingsPath, 0o600);
    return this.publicSettings();
  }

  async apiConfiguration(overrides: { apiKey?: string; baseUrl?: string; model?: string } = {}): Promise<{ apiKey?: string; baseUrl: string; model: string }> {
    return {
      apiKey: overrides.apiKey?.trim() || (this.data.apiKey ? await this.decrypt(this.data.apiKey) : process.env.OPENAI_API_KEY),
      baseUrl: this.validateUrl(overrides.baseUrl || this.data.apiBaseUrl || process.env.OPENAI_BASE_URL || defaultBaseUrl),
      model: overrides.model?.trim() || this.data.apiModel || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    };
  }

  async githubCredentials(): Promise<GitHubCredentials | null> {
    if (!this.data.githubToken) return null;
    return {
      username: this.data.githubUsername?.trim() || 'x-access-token',
      token: await this.decrypt(this.data.githubToken),
      askPassPath: this.askPassPath
    };
  }

  async testGitHub(): Promise<{ login: string }> {
    const credentials = await this.githubCredentials();
    if (!credentials) throw new Error('Save a GitHub token before testing the connection.');
    const response = await fetch('https://api.github.com/user', {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${credentials.token}`, 'User-Agent': 'FORGE-desktop' }
    });
    if (!response.ok) throw new Error(`GitHub authentication failed (${response.status}).`);
    const profile = await response.json() as { login?: string };
    if (!profile.login) throw new Error('GitHub did not return an account login.');
    return { login: profile.login };
  }

 webResearchEnabled(): boolean { return this.data.webResearchEnabled === true; }
  updateChannel(): 'stable' | 'beta' { return normalizeUpdateChannel(this.data.updateChannel); }

  private validateUrl(value: string): string {
    const parsed = new URL(value.trim());
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('API base URL must use HTTPS or HTTP.');
    if (parsed.username || parsed.password) throw new Error('API base URL must not contain credentials.');
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase());
    if (parsed.protocol === 'http:' && !loopback) throw new Error('Remote API base URLs must use HTTPS. HTTP is allowed only for loopback providers.');
    return parsed.toString().replace(/\/$/, '');
  }

  private async encrypt(value: string): Promise<string> {
    if (!this.encryptionAvailable) throw new Error('Secure OS credential storage is not available. Secrets were not saved.');
    return (await safeStorage.encryptStringAsync(value)).toString('base64');
  }

  private async decrypt(value: string): Promise<string> {
    if (!this.encryptionAvailable) throw new Error('Secure OS credential storage is not available.');
    return (await safeStorage.decryptStringAsync(Buffer.from(value, 'base64'))).result;
  }
}
