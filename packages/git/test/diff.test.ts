import { describe, expect, it } from 'vitest';
import { parseDiff } from '../src';
describe('parseDiff', () => it('parses additions and deletions', () => { const diff = parseDiff('diff --git a/a.ts b/a.ts\n@@ -1,1 +1,2 @@\n old\n-oldValue\n+newValue\n+more'); expect(diff.files[0].additions).toBe(2); expect(diff.files[0].deletions).toBe(1); }));
