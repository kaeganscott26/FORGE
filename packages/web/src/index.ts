import { lookup } from 'node:dns/promises';
import { lookup as systemLookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent, fetch } from 'undici';

export interface WebEvidence { title: string; url: string; excerpt: string; sourceType: 'external-web'; fetchedAt: number; }
export interface WebResponse { url: string; status: number; contentType: string; body: string; truncated: boolean; citations: Array<{ url: string; title: string }>; }

function privateAddress(address: string): boolean {
  if (address === '::1' || address === '::' || /^fe[89ab][0-9a-f]:/i.test(address) || /^f[cd][0-9a-f]{2}:/i.test(address)) return true;
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(address);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

export async function validateExternalUrl(value: string): Promise<URL> {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('A valid external URL is required.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are allowed.');
  if (url.username || url.password) throw new Error('Credentials in URLs are forbidden.');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) throw new Error('Local-network URLs are blocked.');
  if (isIP(hostname) && privateAddress(hostname)) throw new Error('Private and local network addresses are blocked.');
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error('The URL resolves to a private or unsafe network address.');
  return url;
}

export class WebService {
  private readonly dispatcher = new Agent({ connect: { lookup: (hostname, options, callback) => {
    // Undici can request `all: true`; always resolve a concrete address before
    // returning to it. Passing an unresolved all-address result produced an
    // undefined address and made otherwise valid HTTPS fetches fail.
    const complete = callback as unknown as (error: Error | null, addresses: Array<{ address: string; family: number }>) => void;
    systemLookup(hostname, { family: options.family, hints: options.hints, all: true, verbatim: true }, (error, addresses) => {
      if (error) { complete(error, []); return; }
      const publicAddresses = addresses.filter((candidate) => !privateAddress(candidate.address));
      const address = publicAddresses.find((candidate) => candidate.family === 4) ?? publicAddresses[0];
      if (!address) {
        complete(Object.assign(new Error('Connection to a private or local network address was blocked.'), { code: 'FORGE_PRIVATE_ADDRESS' }), []);
        return;
      }
      complete(null, [address]);
    });
  } } });
  constructor(private readonly enabled: () => boolean, private readonly maxBytes = 2_000_000) {}

  isEnabled(): boolean { return this.enabled(); }

  async fetch(urlValue: string, timeoutMs = 20_000): Promise<WebResponse> {
    if (!this.enabled()) throw new Error('External web research is disabled in Settings.');
    let url = await validateExternalUrl(urlValue);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(Math.max(timeoutMs, 500), 60_000));
    try {
      for (let redirects = 0; redirects <= 4; redirects += 1) {
        const response = await fetch(url, { dispatcher: this.dispatcher, signal: controller.signal, redirect: 'manual', headers: { Accept: 'text/html,text/plain,application/json;q=0.9', 'User-Agent': 'FORGE/1.1 external-research' } });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) throw new Error('External server returned an invalid redirect.');
          url = await validateExternalUrl(new URL(location, url).toString());
          continue;
        }
        const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
        if (!/(?:text\/|application\/(?:json|xml|xhtml\+xml))/i.test(contentType)) throw new Error(`Unsupported external content type: ${contentType}`);
        const buffer = new Uint8Array(await response.arrayBuffer());
        const truncated = buffer.byteLength > this.maxBytes;
        const body = new TextDecoder().decode(buffer.slice(0, this.maxBytes));
        const citations = [...body.matchAll(/<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi)].slice(0, 30).map((match) => ({ url: match[1], title: match[2].replace(/<[^>]+>/g, '').trim() || match[1] }));
        return { url: url.toString(), status: response.status, contentType, body, truncated, citations };
      }
      throw new Error('Too many external redirects.');
    } finally { clearTimeout(timer); }
  }

  async search(query: string, timeoutMs = 20_000): Promise<{ query: string; results: WebEvidence[] }> {
    const normalized = query.trim();
    if (!normalized) throw new Error('A search query is required.');
    if (normalized.length > 1_000) throw new Error('Search query is too long.');
    const response = await this.fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(normalized)}`, timeoutMs);
    const results = [...response.body.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/gi)].slice(0, 10).map((match) => ({
      title: match[2].replace(/<[^>]+>/g, '').trim(), url: match[1], excerpt: match[3].replace(/<[^>]+>/g, '').trim(), sourceType: 'external-web' as const, fetchedAt: Date.now()
    }));
    return { query: normalized, results };
  }
}
