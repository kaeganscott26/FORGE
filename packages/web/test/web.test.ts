import { describe, expect, it } from 'vitest';
import { validateExternalUrl, WebService } from '../src';

describe('web security', () => {
  it('blocks file URLs, embedded credentials, localhost, and private networks', async () => {
    await expect(validateExternalUrl('file:///etc/passwd')).rejects.toThrow(/HTTP/);
    await expect(validateExternalUrl('https://user:pass@example.com')).rejects.toThrow(/Credentials/);
    await expect(validateExternalUrl('http://localhost:3000')).rejects.toThrow(/Local-network/);
    await expect(validateExternalUrl('http://127.0.0.1')).rejects.toThrow(/Private/);
    await expect(validateExternalUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/Private/);
  });

  it('keeps external research disabled until configured', async () => {
    const service = new WebService(() => false);
    await expect(service.fetch('https://example.com')).rejects.toThrow(/disabled/);
    await expect(service.search('FORGE architecture')).rejects.toThrow(/disabled/);
  });

  it.runIf(process.env.FORGE_LIVE_WEB_TEST === '1')('retrieves a public page when external research is enabled', async () => {
    const response = await new WebService(() => true).fetch('https://example.com');
    expect(response.status).toBe(200);
    expect(response.contentType).toMatch(/text\/html/i);
    expect(response.body).toContain('Example Domain');
  }, 30_000);
});
