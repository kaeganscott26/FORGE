import { app, shell } from 'electron';
import electronUpdater from 'electron-updater';
import type { AppUpdateStatus } from '@forge/ipc';

const { autoUpdater } = electronUpdater;
const releasesUrl = 'https://github.com/kaeganscott26/FORGE/releases/latest';

export class UpdaterService {
  private updateStatus: AppUpdateStatus = {
    currentVersion: app.getVersion(),
    state: 'idle',
    message: 'Ready to check for updates.'
  };

  constructor() {
    if (app.isPackaged) {
      autoUpdater.setFeedURL({ provider: 'github', owner: 'kaeganscott26', repo: 'FORGE', releaseType: 'release' });
    }
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.on('checking-for-update', () => this.setStatus('checking', 'Checking GitHub Releases for an update…'));
    autoUpdater.on('update-available', (info) => this.setStatus('available', `FORGE ${info.version} is newer and will download now.`, info.version));
    autoUpdater.on('update-not-available', () => this.setStatus('not-available', 'FORGE is up to date.'));
    autoUpdater.on('download-progress', (progress) => this.setStatus('downloading', `Downloading update: ${Math.round(progress.percent)}%.`, this.updateStatus.availableVersion));
    autoUpdater.on('update-downloaded', (info) => this.setStatus('downloaded', `FORGE ${info.version} is ready. Restart to apply it.`, info.version));
    autoUpdater.on('error', (error) => this.setStatus('error', `Automatic update failed: ${error.message} Download the latest release manually.`));
  }

  setChannel(channel: 'stable' | 'preview'): void {
    autoUpdater.allowPrerelease = channel === 'preview';
    autoUpdater.channel = channel === 'preview' ? 'preview' : 'latest';
  }

  status(): AppUpdateStatus {
    return { ...this.updateStatus, currentVersion: app.getVersion() };
  }

  async check(): Promise<AppUpdateStatus> {
    if (!app.isPackaged) {
      this.setStatus('development', 'Update checks run only in the packaged app. Use npm run install:mac for local builds.');
      return this.status();
    }
    try {
      this.setStatus('checking', 'Checking GitHub Releases for an update…');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown update error.';
      this.setStatus('error', `Automatic update failed: ${message} Download the latest release manually.`);
    }
    return this.status();
  }

  install(): void {
    if (this.updateStatus.state !== 'downloaded') throw new Error('No downloaded update is ready to install.');
    autoUpdater.quitAndInstall(false, true);
  }

  async openLatestRelease(): Promise<void> {
    await shell.openExternal(releasesUrl);
  }

  private setStatus(state: AppUpdateStatus['state'], message: string, availableVersion?: string): void {
    this.updateStatus = { currentVersion: app.getVersion(), state, message, availableVersion };
  }
}
