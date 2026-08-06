import * as path from 'node:path';
import { marked } from 'marked';

export type FrontMatterScalar = string | number | boolean | null;
export type FrontMatterValue = FrontMatterScalar | FrontMatterScalar[];
export type FrontMatterAttributes = Record<string, FrontMatterValue>;

export interface FrontMatterResult {
  attributes: FrontMatterAttributes;
  body: string;
  raw: string | null;
}

export interface MarkdownHeading {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  slug: string;
  line: number;
}

export interface MarkdownLink {
  kind: 'markdown' | 'wiki' | 'autolink';
  target: string;
  label: string;
  title?: string;
  image: boolean;
  external: boolean;
  line: number;
  column: number;
}

export interface MarkdownMetadata {
  title: string | null;
  description: string | null;
  tags: string[];
  wordCount: number;
  estimatedReadingMinutes: number;
  headings: MarkdownHeading[];
  links: MarkdownLink[];
  frontMatter: FrontMatterAttributes;
}

export interface ParsedMarkdown {
  sourcePath?: string;
  source: string;
  body: string;
  html: string;
  frontMatter: FrontMatterAttributes;
  headings: MarkdownHeading[];
  links: MarkdownLink[];
  metadata: MarkdownMetadata;
}

export interface MarkdownSource {
  path: string;
  content: string;
}

export interface Backlink {
  sourcePath: string;
  targetPath: string;
  link: MarkdownLink;
  context: string;
}

function parseScalar(rawValue: string): FrontMatterScalar {
  const value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'null' || value === '~') return null;
  if (/^(?:true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?(?:\d+|\d*\.\d+)$/.test(value)) return Number(value);
  return value;
}

function parseInlineArray(value: string): FrontMatterScalar[] {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];
  const values: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (const character of inner) {
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote ? null : character;
      current += character;
    } else if (character === ',' && !quote) {
      values.push(current);
      current = '';
    } else current += character;
  }
  values.push(current);
  return values.map(parseScalar);
}

function parseFrontMatterBlock(raw: string): FrontMatterAttributes {
  const attributes: FrontMatterAttributes = {};
  const lines = raw.split(/\r?\n/);
  let activeListKey: string | null = null;

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && activeListKey) {
      const current = attributes[activeListKey];
      if (!Array.isArray(current)) throw new Error(`Front matter key is not a list: ${activeListKey}`);
      current.push(parseScalar(listItem[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z_][\w.-]*):(?:\s*(.*))$/);
    if (!pair) throw new Error(`Unsupported front matter line: ${line}`);
    const key = pair[1];
    const rawValue = pair[2].trim();
    if (!rawValue) {
      attributes[key] = [];
      activeListKey = key;
    } else {
      attributes[key] = rawValue.startsWith('[') && rawValue.endsWith(']')
        ? parseInlineArray(rawValue)
        : parseScalar(rawValue);
      activeListKey = null;
    }
  }
  return attributes;
}

export function frontMatter(content: string): FrontMatterResult {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { attributes: {}, body: content, raw: null };
  return {
    attributes: parseFrontMatterBlock(match[1]),
    body: content.slice(match[0].length),
    raw: match[1]
  };
}

function positionAt(content: string, index: number): { line: number; column: number } {
  const prefix = content.slice(0, index);
  const lines = prefix.split(/\r?\n/);
  return { line: lines.length, column: lines.at(-1)!.length + 1 };
}

function isExternalTarget(target: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target);
}

function codeRanges(content: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const match of content.matchAll(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g)) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  for (const match of content.matchAll(/(`+)[^`\r\n]*?\1/g)) {
    if (!ranges.some((range) => match.index >= range.start && match.index < range.end)) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return ranges;
}

export function extractLinks(content: string): MarkdownLink[] {
  const links: Array<MarkdownLink & { index: number }> = [];
  const occupied = new Set<number>();
  const ignoredRanges = codeRanges(content);
  const isIgnored = (index: number): boolean => ignoredRanges.some((range) => index >= range.start && index < range.end);

  for (const match of content.matchAll(/\[\[([^\]|#]+(?:#[^\]|]+)?)(?:\|([^\]]+))?\]\]/g)) {
    const index = match.index;
    if (isIgnored(index)) continue;
    const position = positionAt(content, index);
    links.push({
      kind: 'wiki',
      target: match[1].trim(),
      label: (match[2] ?? match[1]).trim(),
      image: false,
      external: false,
      ...position,
      index
    });
    for (let offset = index; offset < index + match[0].length; offset++) occupied.add(offset);
  }

  for (const match of content.matchAll(/(!?)\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/g)) {
    const index = match.index;
    if (occupied.has(index) || isIgnored(index)) continue;
    const position = positionAt(content, index);
    links.push({
      kind: 'markdown',
      target: match[3].replace(/^<|>$/g, ''),
      label: match[2],
      title: match[4] || undefined,
      image: match[1] === '!',
      external: isExternalTarget(match[3]),
      ...position,
      index
    });
    for (let offset = index; offset < index + match[0].length; offset++) occupied.add(offset);
  }

  for (const match of content.matchAll(/<((?:https?:\/\/|mailto:)[^>]+)>/gi)) {
    const index = match.index;
    if (occupied.has(index) || isIgnored(index)) continue;
    const position = positionAt(content, index);
    links.push({
      kind: 'autolink',
      target: match[1],
      label: match[1],
      image: false,
      external: true,
      ...position,
      index
    });
  }

  return links
    .sort((left, right) => left.index - right.index)
    .map(({ index: _index, ...link }) => link);
}

function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?(?:\[([^\]]*)\]\([^)]*\)|\[\[([^\]|]+)(?:\|([^\]]+))?\]\])/g, '$1 $3 $2')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~|-]/g, ' ');
}

function extractHeadings(body: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const slugs = new Map<string, number>();
  let fenced = false;
  const lines = body.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) return;
    const text = match[2].trim();
    const baseSlug = text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    const occurrence = slugs.get(baseSlug) ?? 0;
    slugs.set(baseSlug, occurrence + 1);
    headings.push({
      level: match[1].length as MarkdownHeading['level'],
      text,
      slug: occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence}`,
      line: index + 1
    });
  });
  return headings;
}

function tagsFrom(attributes: FrontMatterAttributes, body: string): string[] {
  const tags = new Set<string>();
  const declaredTags = attributes.tags ?? attributes.tag;
  const values = Array.isArray(declaredTags) ? declaredTags : declaredTags === undefined ? [] : [declaredTags];
  for (const value of values) if (typeof value === 'string' && value.trim()) tags.add(value.trim().replace(/^#/, ''));

  const searchableBody = body.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ').replace(/`[^`]*`/g, ' ');
  for (const match of searchableBody.matchAll(/(?:^|\s)#([\p{L}\p{N}_/-]+)/gu)) tags.add(match[1]);
  return [...tags];
}

export function metadata(content: string): MarkdownMetadata {
  const parsedFrontMatter = frontMatter(content);
  const headings = extractHeadings(parsedFrontMatter.body);
  const links = extractLinks(parsedFrontMatter.body);
  const words = plainText(parsedFrontMatter.body).trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  const declaredTitle = parsedFrontMatter.attributes.title;
  const declaredDescription = parsedFrontMatter.attributes.description;
  return {
    title: typeof declaredTitle === 'string' ? declaredTitle : headings[0]?.text ?? null,
    description: typeof declaredDescription === 'string' ? declaredDescription : null,
    tags: tagsFrom(parsedFrontMatter.attributes, parsedFrontMatter.body),
    wordCount: words.length,
    estimatedReadingMinutes: words.length === 0 ? 0 : Math.max(1, Math.ceil(words.length / 200)),
    headings,
    links,
    frontMatter: parsedFrontMatter.attributes
  };
}

export function parseMarkdown(content: string, sourcePath?: string): ParsedMarkdown {
  const parsedFrontMatter = frontMatter(content);
  const documentMetadata = metadata(content);
  return {
    sourcePath,
    source: content,
    body: parsedFrontMatter.body,
    html: marked.parse(parsedFrontMatter.body, { async: false }) as string,
    frontMatter: parsedFrontMatter.attributes,
    headings: documentMetadata.headings,
    links: documentMetadata.links,
    metadata: documentMetadata
  };
}

function comparablePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/').replace(/\.md$/i, '').replace(/^\.\//, '').toLowerCase();
}

function targetsPath(link: MarkdownLink, sourcePath: string, targetPath: string): boolean {
  if (link.external || link.image) return false;
  const targetWithoutFragment = link.target.split('#', 1)[0];
  if (!targetWithoutFragment) return comparablePath(sourcePath) === comparablePath(targetPath);
  const target = comparablePath(targetPath);
  if (link.kind === 'wiki') {
    const linked = comparablePath(targetWithoutFragment);
    return linked === target || path.posix.basename(linked) === path.posix.basename(target);
  }
  const resolved = comparablePath(path.resolve(path.dirname(sourcePath), targetWithoutFragment));
  return resolved === comparablePath(path.resolve(targetPath));
}

export function extractBacklinks(targetPath: string, documents: readonly MarkdownSource[]): Backlink[] {
  const backlinks: Backlink[] = [];
  for (const document of documents) {
    const lines = document.content.split(/\r?\n/);
    for (const link of extractLinks(document.content)) {
      if (!targetsPath(link, document.path, targetPath)) continue;
      backlinks.push({
        sourcePath: document.path,
        targetPath,
        link,
        context: lines[link.line - 1]?.trim() ?? ''
      });
    }
  }
  return backlinks;
}
