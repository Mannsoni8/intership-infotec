import { FlatBlock } from './blockTree';
import { escapeHtml, sanitizeHtmlFragment, sanitizeLine } from './sanitize';

// turns the blocks into an html body. Every text is escaped first.
function blocksToBody(blocks: FlatBlock[]): string {
  let html = '';
  let open = 0; // how many <ul> are open
  const closeLists = () => {
    while (open > 0) {
      html += '</li></ul>';
      open--;
    }
  };

  for (const block of blocks) {
    const text = escapeHtml(block.text);

    if (block.type === 'listItem') {
      if (open === 0) {
        html += '<ul>';
        open = 1;
      } else if (block.depth + 1 > open) {
        html += '<ul>'; // nested list inside the open <li>
        open++;
      } else {
        while (open > block.depth + 1) {
          html += '</li></ul>';
          open--;
        }
        html += '</li>';
      }
      html += `<li>${text}`;
      continue;
    }

    closeLists();
    if (block.type === 'heading') {
      const level = Math.min(6, Math.max(1, block.level ?? 1)) + 1; // h1 is the title
      const tag = `h${Math.min(level, 6)}`;
      html += `<${tag}>${text}</${tag}>`;
    } else if (block.type === 'quote') {
      html += `<blockquote>${text.replace(/\n/g, '<br>')}</blockquote>`;
    } else if (block.type === 'codeBlock') {
      html += `<pre><code>${text}</code></pre>`;
    } else {
      html += `<p>${text.replace(/\n/g, '<br>')}</p>`;
    }
  }
  closeLists();
  return html;
}

// full html page. The html goes through DOMPurify one more time as a safety net,
// and the page has a Content-Security-Policy that blocks all scripts.
export function blocksToHtml(title: string, blocks: FlatBlock[]): string {
  const safeTitle = escapeHtml(sanitizeLine(title, 120));
  const body = sanitizeHtmlFragment(`<h1>${safeTitle}</h1>${blocksToBody(blocks)}`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>${safeTitle}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.6;color:#222}
pre{background:#272822;color:#f8f8f2;padding:12px;border-radius:4px;overflow:auto}
blockquote{border-left:4px solid #bbb;margin-left:0;padding-left:12px;color:#555;font-style:italic}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}
