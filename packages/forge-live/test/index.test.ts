import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { ForgeLiveService, injectReloadClient, isIgnoredPath, isLoopbackUrl } from '../src/index';

const services: ForgeLiveService[] = [];
const roots: string[] = [];
afterEach(async () => { await Promise.all(services.splice(0).map((service) => service.stop())); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'forge-live-')); roots.push(root);
  for (const [name, content] of Object.entries(files)) { await mkdir(join(root, name, '..'), { recursive: true }); await writeFile(join(root, name), content); }
  return root;
}
async function rawStatus(url: string, requestPath: string): Promise<number> { return new Promise((resolve, reject) => { const parsed = new URL(url); const req = httpRequest({ hostname: parsed.hostname, port: parsed.port, path: requestPath }, (response) => { response.resume(); response.once('end', () => resolve(response.statusCode ?? 0)); }); req.once('error', reject); req.end(); }); }

describe('FORGE Live static server', () => {
  it('serves HTML, assets, directory indexes, and a useful root fallback', async () => {
    const root = await fixture({ 'index.html': '<!doctype html><body>Hello</body>', 'style.css': 'body{color:red}', 'folder/index.html': '<p>Folder</p>' });
    const service = new ForgeLiveService(root, { preferredPort: 5600, portEnd: 5600 }); services.push(service); const state = await service.start();
    expect((await fetch(`${state.url}/`)).status).toBe(200); expect(await (await fetch(`${state.url}/`)).text()).toContain('/__forge_live');
    expect((await fetch(`${state.url}/style.css`)).headers.get('content-type')).toContain('text/css'); expect((await fetch(`${state.url}/folder/`)).status).toBe(200); expect((await fetch(`${state.url}/missing.js`)).status).toBe(404);
  });

  it('blocks traversal and returns a fallback when index.html is absent', async () => {
    const root = await fixture({ 'secret.txt': 'private' }); const service = new ForgeLiveService(root, { preferredPort: 5601, portEnd: 5601 }); services.push(service); const state = await service.start();
    expect(await (await fetch(`${state.url!}/`)).text()).toContain('No index.html found'); expect(await rawStatus(state.url!, '/%2e%2e/%2e%2e/secret.txt')).toBe(403);
  });
});

describe('FORGE Live policies', () => {
  it('allows only exact loopback hosts', () => {
    expect(isLoopbackUrl('http://localhost:5500')).toBe(true); expect(isLoopbackUrl('http://127.0.0.1:5500')).toBe(true); expect(isLoopbackUrl('http://[::1]:5500')).toBe(true);
    expect(isLoopbackUrl('http://localhost.attacker.com:5500')).toBe(false); expect(isLoopbackUrl('http://127.0.0.1.attacker.com:5500')).toBe(false);
  });
  it('does not inject files on disk and ignores generated directories', () => { const html = '<html><body>ok</body></html>'; expect(injectReloadClient(html)).not.toBe(html); expect(isIgnoredPath('node_modules/pkg/index.js')).toBe(true); expect(isIgnoredPath('src/index.html')).toBe(false); });
});
