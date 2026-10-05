import { blocksToHtml } from '../utils/exportHtml';
import { blocksToPdf } from '../utils/exportPdf';
import { FlatBlock } from '../utils/blockTree';

const b = (type: FlatBlock['type'], text: string, depth = 0, level?: number): FlatBlock => ({
  id: `${type}-${text.length}-${depth}`,
  type,
  text,
  depth,
  level,
});

describe('HTML export', () => {
  test('escapes everything, so nothing can run as a script', () => {
    const html = blocksToHtml('<script>alert("title")</script>', [
      b('paragraph', '<script>alert(1)</script>'),
      b('heading', '<img src=x onerror=alert(2)>', 0, 1),
      b('codeBlock', '</code></pre><script>alert(3)</script>'),
      b('listItem', '<svg onload=alert(4)>'),
      b('quote', '"><iframe src=javascript:alert(5)>'),
    ]);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<(img|svg|iframe)/i);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain("default-src 'none'"); // the page also blocks scripts by itself
  });

  test('builds nested lists correctly', () => {
    const html = blocksToHtml('T', [
      b('listItem', 'a'),
      b('listItem', 'a1', 1),
      b('listItem', 'a2', 1),
      b('listItem', 'b'),
      b('paragraph', 'end'),
    ]);
    expect(html).toContain('<ul><li>a<ul><li>a1</li><li>a2</li></ul></li><li>b</li></ul><p>end</p>');
  });
});

describe('PDF export', () => {
  test('creates a real pdf file with all block types', async () => {
    const pdf = blocksToPdf('My Spec', [
      b('heading', 'Intro', 0, 1),
      b('paragraph', 'Hello world. '.repeat(200)),
      b('listItem', 'one'),
      b('listItem', 'nested', 1),
      b('quote', 'quoted text'),
      b('codeBlock', 'const a = 1;\n'.repeat(80)),
      b('paragraph', 'हिन्दी text and emoji 😀 become question marks'),
    ]);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      pdf.on('data', (c: Buffer) => chunks.push(c));
      pdf.on('end', () => resolve());
      pdf.on('error', reject);
    });
    const file = Buffer.concat(chunks);
    expect(file.subarray(0, 5).toString()).toBe('%PDF-');
    expect(file.length).toBeGreaterThan(1500);
  });
});
