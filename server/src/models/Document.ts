import { Schema, Types, model, HydratedDocument } from 'mongoose';
import { sanitizeBlockText, sanitizeLine } from '../utils/sanitize';

// all the block types a document can have
export const BLOCK_TYPES = [
  'heading',
  'paragraph',
  'codeBlock',
  'quote',
  'list',
  'listItem',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

// errors in this file come from bad user data, so the api answers with 400 (not 500)
export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentValidationError';
  }
}

// limits (also protect the server from huge documents)
export const MAX_DEPTH = 5;
export const MAX_BLOCKS = 1000;
export const MAX_COLLABORATORS = 20;

// one node of the document tree (AST)
export interface IBlockNode {
  blockId: string;
  type: BlockType;
  text: string;
  level?: number; // only for headings (1-6)
  parentId: string | null; // filled by the pre-save hook
  depth: number; // filled by the pre-save hook
  path: string; // e.g. "abc/def/ghi", filled by the pre-save hook
  children: IBlockNode[];
}

export interface IDocument {
  title: string;
  owner: Types.ObjectId;
  collaborators: Types.ObjectId[];
  blocks: IBlockNode[];
  createdAt: Date;
  updatedAt: Date;
}

// the child schema. _id is turned off because we use our own blockId
const blockSchema = new Schema<IBlockNode>(
  {
    blockId: { type: String, required: true, match: /^[A-Za-z0-9-]{1,64}$/ },
    type: { type: String, enum: BLOCK_TYPES, required: true },
    text: { type: String, default: '', maxlength: 10000 },
    level: { type: Number, min: 1, max: 6 },
    parentId: { type: String, default: null },
    depth: { type: Number, default: 0 },
    path: { type: String, default: '' },
  },
  { _id: false }
);

// children is added after creating the schema so that it can point to itself (nested nodes)
blockSchema.add({ children: [blockSchema] });

const documentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    collaborators: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [], index: true },
    blocks: { type: [blockSchema], default: [] },
  },
  { timestamps: true }
);

// which types are allowed to have children
function canHaveChildren(type: BlockType): boolean {
  return type === 'list' || type === 'listItem';
}

// recursive function that goes through the whole tree and checks every node.
// it sets parentId, depth and path, and cleans the text of every block (DOMPurify)
function checkNodes(
  nodes: IBlockNode[],
  parent: IBlockNode | null,
  depth: number,
  state: { seenIds: Set<string>; count: number }
): void {
  if (depth > MAX_DEPTH) {
    throw new DocumentValidationError(`Document is nested too deep (max depth is ${MAX_DEPTH})`);
  }

  for (const node of nodes) {
    state.count++;
    if (state.count > MAX_BLOCKS) {
      throw new DocumentValidationError(`Document has too many blocks (max ${MAX_BLOCKS})`);
    }

    // ids must be unique in the whole document
    if (state.seenIds.has(node.blockId)) {
      throw new DocumentValidationError(`Duplicate blockId found: ${node.blockId}`);
    }
    state.seenIds.add(node.blockId);

    // list items must live inside a list (or another list item)
    if (node.type === 'listItem' && (!parent || !canHaveChildren(parent.type))) {
      throw new DocumentValidationError('A listItem must be inside a list');
    }

    // a list can only contain list items
    if (parent && parent.type === 'list' && node.type !== 'listItem') {
      throw new DocumentValidationError('A list can only contain listItem blocks');
    }

    // only lists and list items can have children
    if (node.children.length > 0 && !canHaveChildren(node.type)) {
      throw new DocumentValidationError(`A ${node.type} block cannot have children`);
    }

    // headings need a level
    if (node.type === 'heading' && !node.level) {
      node.level = 1;
    }

    // SECURITY: remove dirty html / xss fragments from the saved text
    node.text = sanitizeBlockText(node.type, node.text);

    // set the relationship info
    node.parentId = parent ? parent.blockId : null;
    node.depth = depth;
    node.path = parent ? `${parent.path}/${node.blockId}` : node.blockId;

    // go deeper (recursion)
    checkNodes(node.children, node, depth + 1, state);
  }
}

// runs every time before a document is saved
documentSchema.pre('save', function (next) {
  try {
    this.title = sanitizeLine(this.title, 120);
    if (!this.title) {
      throw new DocumentValidationError('Title is required');
    }
    if (this.collaborators.length > MAX_COLLABORATORS) {
      throw new DocumentValidationError(`Too many collaborators (max ${MAX_COLLABORATORS})`);
    }
    checkNodes(this.blocks, null, 0, { seenIds: new Set<string>(), count: 0 });
    next();
  } catch (err) {
    next(err as Error);
  }
});

export type DocumentDoc = HydratedDocument<IDocument>;
export const DocumentModel = model<IDocument>('Document', documentSchema);
