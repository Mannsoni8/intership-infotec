import { sanitizeBlockText, sanitizeLine, escapeHtml } from '../utils/sanitize';

const DANGEROUS = /<\s*(script|img|svg|iframe|style|object|embed|a\s)/i;

const PAYLOADS = [
  '<script>alert(1)</script>Hello',
  '<img src=x onerror=alert(1)>Hello',
  '<svg onload=alert(1)>Hello</svg>',
  '<iframe src="javascript:alert(1)"></iframe>Hello',
  '<<b>script>alert(1)<</b>/script>Hello', // builds a new tag after the first cleaning
  '<a href="javascript:alert(1)">Hello</a>',
  '<style>body{display:none}</style>Hello',
  '<div onmouseover="alert(1)">Hello</div>',
];

describe('sanitizeBlockText (DOMPurify)', () => {
  test.each(PAYLOADS)('removes dangerous html: %s', (payload) => {
    const clean = sanitizeBlockText('paragraph', payload);
    expect(clean).not.toMatch(DANGEROUS);
    expect(clean).not.toMatch(/onerror|onload|onmouseover/i);
  });

  test('keeps normal text, symbols and new lines', () => {
    expect(sanitizeBlockText('paragraph', 'Tom & Jerry: 5 < 7 and 9 > 2\nsecond line')).toBe(
      'Tom & Jerry: 5 < 7 and 9 > 2\nsecond line'
    );
  });

  test('keeps non-english text', () => {
    expect(sanitizeBlockText('paragraph', 'नमस्ते दुनिया')).toBe('नमस्ते दुनिया');
  });

  test('code blocks keep < and > (they are escaped when exported)', () => {
    const code = 'const x: Array<string> = [];\nif (a<b && c>d) {}';
    expect(sanitizeBlockText('codeBlock', code)).toBe(code);
  });

  test('removes null bytes and control characters', () => {
    expect(sanitizeBlockText('paragraph', 'a\u0000b\u0007c')).toBe('abc');
  });

  test('limits the text length', () => {
    expect(sanitizeBlockText('paragraph', 'x'.repeat(50000)).length).toBe(10000);
  });
});

describe('sanitizeLine and escapeHtml', () => {
  test('titles are single line plain text', () => {
    expect(sanitizeLine('  <b>My</b>\n  title <script>x</script> ', 120)).toBe('My title');
  });

  test('escapeHtml escapes all dangerous characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });
});
