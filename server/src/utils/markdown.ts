import { FlatBlock, MAX_ITEM_DEPTH } from './blockTree';
import { MAX_BLOCKS } from '../models/Document';

export const MAX_MARKDOWN_LENGTH = 200000;

// Markdown text -> flat blocks (JSON).
// supports: # headings, paragraphs, > quotes, - / * / 1. lists (2 spaces = 1 level), ``` code
export function markdownToBlocks(markdown: string): FlatBlock[] {
  const lines = markdown.slice(0, MAX_MARKDOWN_LENGTH).replace(/\r\n?/g, '\n').split('\n');
  const blocks: FlatBlock[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];
  let counter = 0;

  const nextId = () => `md-${++counter}`;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ id: nextId(), type: 'paragraph', depth: 0, text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push({ id: nextId(), type: 'quote', depth: 0, text: quote.join('\n') });
      quote = [];
    }
  };

  let i = 0;
  while (i < lines.length && blocks.length < MAX_BLOCKS) {
    const line = lines[i];

    // fenced code block
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      flushParagraph();
      flushQuote();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) {
        code.push(lines[i]);
        i++;
      }
      blocks.push({ id: nextId(), type: 'codeBlock', depth: 0, text: code.join('\n') });
      i++; // skip the closing fence
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    const quoteLine = line.match(/^\s{0,3}>\s?(.*)$/);
    const item = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);

    if (heading) {
      flushParagraph();
      flushQuote();
      blocks.push({
        id: nextId(),
        type: 'heading',
        depth: 0,
        level: heading[1].length,
        text: heading[2],
      });
    } else if (quoteLine) {
      flushParagraph();
      quote.push(quoteLine[1]);
    } else if (item) {
      flushParagraph();
      flushQuote();
      const indent = item[1].replace(/\t/g, '  ').length;
      blocks.push({
        id: nextId(),
        type: 'listItem',
        depth: Math.min(Math.floor(indent / 2), MAX_ITEM_DEPTH),
        text: item[3],
      });
    } else if (line.trim() === '') {
      flushParagraph();
      flushQuote();
    } else {
      flushQuote();
      paragraph.push(line.trim());
    }
    i++;
  }
  flushParagraph();
  flushQuote();
  return blocks.slice(0, MAX_BLOCKS);
}

// flat blocks -> Markdown text
export function blocksToMarkdown(blocks: FlatBlock[]): string {
  const parts: string[] = [];
  let previousWasItem = false;

  for (const block of blocks) {
    let out = '';
    switch (block.type) {
      case 'heading':
        out = `${'#'.repeat(block.level ?? 1)} ${block.text.replace(/\n/g, ' ')}`;
        break;
      case 'quote':
        out = block.text
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n');
        break;
      case 'codeBlock': {
        const fence = block.text.includes('```') ? '~~~~' : '```';
        out = `${fence}\n${block.text}\n${fence}`;
        break;
      }
      case 'listItem':
        out = `${'  '.repeat(block.depth)}- ${block.text.replace(/\n/g, ' ')}`;
        break;
      default:
        out = block.text;
    }

    // list items stay together, everything else is separated by an empty line
    if (block.type === 'listItem' && previousWasItem) {
      parts[parts.length - 1] += `\n${out}`;
    } else {
      parts.push(out);
    }
    previousWasItem = block.type === 'listItem';
  }
  return parts.join('\n\n') + '\n';
}
