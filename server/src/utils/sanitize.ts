import DOMPurify from 'isomorphic-dompurify';
import { BlockType } from '../models/Document';

export const MAX_TEXT_LENGTH = 10000;

// removes control characters (except new line and tab) and null bytes
function cleanControlChars(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

// Uses DOMPurify with NO allowed tags and NO allowed attributes, so every html
// fragment (script, img onerror, iframe, svg, style ...) is removed and only the text stays.
// RETURN_DOM_FRAGMENT gives us a real DOM so textContent returns plain text (no &amp; etc).
function stripMarkup(text: string): string {
  const fragment = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
  });
  return fragment.textContent || '';
}

// Sanitizes the text of one block before it is saved in the database.
// - normal text blocks: all markup is removed. We repeat the cleaning until the text
//   does not change anymore, because tricks like "<<b>script>" can build a new tag after one pass.
// - code blocks: code can really contain < and > (generics, jsx...), so it is kept as text.
//   It is never inserted as html anywhere: the editor uses a textarea and the exporters escape it.
export function sanitizeBlockText(type: BlockType, text: string): string {
  let result = cleanControlChars(String(text ?? ''));

  if (type !== 'codeBlock') {
    for (let i = 0; i < 5; i++) {
      const cleaned = stripMarkup(result);
      if (cleaned === result) break;
      result = cleaned;
    }
  }

  return result.slice(0, MAX_TEXT_LENGTH);
}

// titles and user names are single line plain text
export function sanitizeLine(text: string, maxLength: number): string {
  let result = cleanControlChars(String(text ?? '')).replace(/\s+/g, ' ');
  for (let i = 0; i < 5; i++) {
    const cleaned = stripMarkup(result);
    if (cleaned === result) break;
    result = cleaned;
  }
  return result.trim().slice(0, maxLength);
}

// escapes text so it can be placed inside html
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// final safety net for generated html: only a small list of tags, no attributes at all
export function sanitizeHtmlFragment(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'pre', 'code', 'ul', 'li', 'br'],
    ALLOWED_ATTR: [],
  });
}
