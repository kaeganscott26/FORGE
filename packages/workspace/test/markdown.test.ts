import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../src';
describe('parseMarkdown', () => it('extracts frontmatter, links, tags, and headings', () => { const parsed = parseMarkdown('---\ntitle: Forge\ntags: [app, local]\n---\n# Hello\nSee [[Plan|the plan]] #focus\n```ts\n# ignored\n```'); expect(parsed.frontmatter.title).toBe('Forge'); expect(parsed.wikiLinks).toEqual(['Plan']); expect(parsed.tags).toEqual(['focus']); expect(parsed.headings[0].slug).toBe('hello'); }));
