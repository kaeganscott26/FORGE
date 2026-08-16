import { describe, expect, it } from 'vitest';
import { parseDesktopEntry, ForgeOsService } from '../src/index';
describe('FORGE OS integration', () => {
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
