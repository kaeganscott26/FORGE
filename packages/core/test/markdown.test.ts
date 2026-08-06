import { describe, expect, it } from 'vitest';
import { extractBacklinks, extractLinks, frontMatter, metadata, parseMarkdown } from '../markdown/index.js';

const document = `---
title: "Core Architecture"
published: true
priority: 2
tags: [forge, architecture]
owners:
  - Kaegan
  - FORGE
---
# Overview

See [[Design Notes|the design]], [workspace](../workspace.md), and <https://forge.example>.

# Overview

Production-ready core documentation.
`;

describe('Markdown API', () => {
  it('parses front matter, links, headings, HTML, and metadata', () => {
    expect(frontMatter(document).attributes).toMatchObject({
      title: 'Core Architecture',
      published: true,
      priority: 2,
      tags: ['forge', 'architecture'],
      owners: ['Kaegan', 'FORGE']
    });

    const parsed = parseMarkdown(document, '/vault/core.md');
    expect(parsed.html).toContain('<h1>Overview</h1>');
    expect(parsed.headings.map((heading) => heading.slug)).toEqual(['overview', 'overview-1']);
    expect(parsed.metadata.title).toBe('Core Architecture');
    expect(parsed.links.map((link) => link.kind)).toEqual(['wiki', 'markdown', 'autolink']);
    expect(metadata(document).tags).toEqual(['forge', 'architecture']);
  });

  it('extracts typed links and backlinks from a document collection', () => {
    const links = extractLinks('Read [[Target|target note]] and ![preview](target.png).');
    expect(links).toMatchObject([
      { kind: 'wiki', target: 'Target', image: false },
      { kind: 'markdown', target: 'target.png', image: true }
    ]);
    expect(extractLinks('`[[not-a-link]]`\n```md\n[also ignored](ignored.md)\n```')).toEqual([]);

    const backlinks = extractBacklinks('/vault/Target.md', [
      { path: '/vault/source.md', content: 'Read [[Target]] for context.' },
      { path: '/vault/other.md', content: 'Nothing to see here.' }
    ]);
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0]).toMatchObject({ sourcePath: '/vault/source.md', targetPath: '/vault/Target.md' });
    expect(backlinks[0].context).toBe('Read [[Target]] for context.');
  });
});
