import { describe, expect, it } from 'vitest';
import { homedir } from 'node:os';
import { applicationDirectories, parseDesktopEntry, ForgeOsService } from '../src/index';
describe('FORGE OS integration', () => {
  it('resolves XDG application directories in precedence order', () => {
    expect(applicationDirectories({ HOME: '/home/test', XDG_DATA_HOME: '/home/test/data', XDG_DATA_DIRS: '/foo/share:/bar/share' } as NodeJS.ProcessEnv)).toEqual(['/home/test/data/applications', '/foo/share/applications', '/bar/share/applications']);
  });
  it('uses standard fallbacks and parses Flatpak exports', () => {
    expect(applicationDirectories({})).toEqual([`${homedir()}/.local/share/applications`, '/usr/local/share/applications', '/usr/share/applications']);
    const app = parseDesktopEntry('[Desktop Entry]\nType=Application\nName=Flatpak App\nExec=/usr/bin/flatpak run --branch=stable org.example.App @@u %U @@\nIcon=org.example.App\nDBusActivatable=true\n', '/var/lib/flatpak/exports/share/applications/org.example.App.desktop');
    expect(app).toMatchObject({ id: 'org.example.App.desktop', executable: '/usr/bin/flatpak', arguments: ['run', '--branch=stable', 'org.example.App'], dbusActivatable: true });
  });
  it('filters visibility keys without rejecting valid entries', () => {
    const service = new ForgeOsService({ XDG_CURRENT_DESKTOP: 'FORGE' });
    expect(parseDesktopEntry('[Desktop Entry]\nType=Application\nName=Hidden\nHidden=true\nExec=/bin/true\n', '/tmp/hidden.desktop')).toMatchObject({ hidden: true });
    expect(parseDesktopEntry('[Desktop Entry]\nType=Application\nName=Malformed\nExec="unterminated\n', '/tmp/bad.desktop')).toBeNull();
    expect(service).toBeTruthy();
  });
  it('normalizes desktop metadata and removes field codes', () => { const app = parseDesktopEntry('[Desktop Entry]\nType=Application\nName=Browser\nExec=/usr/bin/browser --new-window %U\nCategories=Network;WebBrowser;\n', '/usr/share/applications/browser.desktop'); expect(app).toMatchObject({ id: 'browser.desktop', executable: '/usr/bin/browser', arguments: ['--new-window'], categories: ['Network', 'WebBrowser'] }); });
  it('does not interpret shell operators', () => { const app = parseDesktopEntry('[Desktop Entry]\nType=Application\nName=Literal\nExec=/bin/echo hello;touch /tmp/nope\n', '/tmp/literal.desktop'); expect(app?.arguments).toContain('hello;touch'); });
  it('requires FORGE desktop identity for shell mode', () => { const linux = () => 'linux'; expect(new ForgeOsService({ XDG_CURRENT_DESKTOP: 'FORGE' }, linux).context().shellMode).toBe(true); expect(new ForgeOsService({ XDG_CURRENT_DESKTOP: 'GNOME' }, linux).context().shellMode).toBe(false); });
  it('distinguishes installed recovery from ephemeral live recovery', () => {
    const linux = () => 'linux';
    const installed = new ForgeOsService({ FORGE_OS_SESSION: '1', FORGE_RECOVERY_MODE: '1' }, linux).context();
    expect(installed.recoveryMode).toBe(true);
    expect(installed.liveRecoveryMode).toBe(false);
    const live = new ForgeOsService({ FORGE_OS_SESSION: '1', FORGE_RECOVERY_MODE: '1', FORGE_LIVE_RECOVERY: '1' }, linux).context();
    expect(live.recoveryMode).toBe(true);
    expect(live.liveRecoveryMode).toBe(true);
  });
});
