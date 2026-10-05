import { randomUUID } from 'crypto';
import { IBlockNode, BlockType, BLOCK_TYPES, MAX_BLOCKS } from '../models/Document';
import { MAX_TEXT_LENGTH } from './sanitize';

// Simple flat version of a block. The editor (Yjs) works with a flat list,
// the database stores a tree. These two functions convert between them.
//   depth is only used by list items (0 = first level of the list, 1 = nested...)
export interface FlatBlock {
  id: string;
  type: BlockType;
  depth: number;
  text: string;
  level?: number;
}

export const MAX_ITEM_DEPTH = 4;
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

// tree -> flat list. "list" containers are not shown as blocks, only their items
export function flattenBlocks(nodes: IBlockNode[], itemDepth = 0): FlatBlock[] {
  const result: FlatBlock[] = [];
  for (const node of nodes) {
    const children = node.children ?? [];
    if (node.type === 'list') {
      result.push(...flattenBlocks(children, itemDepth));
    } else if (node.type === 'listItem') {
      result.push({ id: node.blockId, type: 'listItem', depth: itemDepth, text: node.text });
      result.push(...flattenBlocks(children, itemDepth + 1));
    } else {
      const flat: FlatBlock = { id: node.blockId, type: node.type, depth: 0, text: node.text };
      if (node.type === 'heading') flat.level = node.level ?? 1;
      result.push(flat);
    }
  }
  return result;
}

function newNode(id: string, type: BlockType, text: string): IBlockNode {
  return { blockId: id, type, text, parentId: null, depth: 0, path: '', children: [] };
}

// flat list -> tree. Everything that comes from a client is treated as untrusted,
// so ids, types, depths and text length are all checked here.
export function buildTree(flat: FlatBlock[]): IBlockNode[] {
  const result: IBlockNode[] = [];
  const usedIds = new Set<string>();
  let currentList: IBlockNode | null = null;
  let itemStack: IBlockNode[] = []; // the open list items, one per depth

  for (const raw of flat.slice(0, MAX_BLOCKS)) {
    // bad or repeated ids get a new id
    let id = typeof raw.id === 'string' && ID_PATTERN.test(raw.id) ? raw.id : randomUUID();
    if (usedIds.has(id)) id = randomUUID();
    usedIds.add(id);

    const type = BLOCK_TYPES.includes(raw.type) ? raw.type : 'paragraph';
    if (type === 'list') continue; // lists are created automatically from list items
    const text = typeof raw.text === 'string' ? raw.text.slice(0, MAX_TEXT_LENGTH) : '';

    const node = newNode(id, type, text);

    if (type === 'listItem') {
      // an item can only be 1 level deeper than the previous one
      const wanted = Number.isInteger(raw.depth) ? Math.max(0, raw.depth) : 0;
      const depth = Math.min(wanted, itemStack.length, MAX_ITEM_DEPTH);

      if (depth === 0) {
        if (!currentList) {
          currentList = newNode(randomUUID(), 'list', '');
          result.push(currentList);
        }
        currentList.children.push(node);
        itemStack = [node];
      } else {
        itemStack = itemStack.slice(0, depth);
        itemStack[depth - 1].children.push(node);
        itemStack.push(node);
      }
    } else {
      currentList = null;
      itemStack = [];
      if (type === 'heading') {
        const level = Number.isInteger(raw.level) ? Number(raw.level) : 1;
        node.level = Math.min(6, Math.max(1, level));
      }
      result.push(node);
    }
  }
  return result;
}
