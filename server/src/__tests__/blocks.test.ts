import { DocumentModel, IBlockNode, BlockType } from '../models/Document';
import { buildTree, flattenBlocks, FlatBlock } from '../utils/blockTree';
import { markdownToBlocks, blocksToMarkdown } from '../utils/markdown';

const flat = (id: string, type: BlockType, text = id, depth = 0, level?: number): FlatBlock => ({
  id,
  type,
  text,
  depth,
  level,
});

// runs the real mongoose pre-save hooks without needing a database
function runSaveHook(blocks: IBlockNode[], title = 'Doc'): Promise<{ error?: Error; doc: InstanceType<typeof DocumentModel> }> {
  const doc = new DocumentModel({ title, owner: '64b7f0f2a1b2c3d4e5f60718', blocks });
  return new Promise((resolve) => {
    const hooks = (DocumentModel.schema as unknown as {
      s: { hooks: { execPre: (name: string, ctx: unknown, args: unknown[], cb: (e?: Error) => void) => void } };
    }).s.hooks;
    hooks.execPre('save', doc, [], (error?: Error) => resolve({ error, doc }));
  });
}

describe('buildTree / flattenBlocks', () => {
  test('groups list items into a list and nests deeper items', () => {
    const tree = buildTree([
      flat('p1', 'paragraph'),
      flat('a', 'listItem'),
      flat('b', 'listItem'),
      flat('b1', 'listItem', 'b1', 1),
      flat('c', 'listItem'),
      flat('p2', 'paragraph'),
    ]);
    expect(tree.map((n) => n.type)).toEqual(['paragraph', 'list', 'paragraph']);
    const list = tree[1];
    expect(list.children.map((n) => n.blockId)).toEqual(['a', 'b', 'c']);
    expect(list.children[1].children[0].blockId).toBe('b1');
  });

  test('flatten(buildTree(x)) gives back the same blocks', () => {
    const input = [
      flat('h', 'heading', 'Title', 0, 2),
      flat('a', 'listItem'),
      flat('a1', 'listItem', 'a1', 1),
      flat('q', 'quote'),
    ];
    const output = flattenBlocks(buildTree(input));
    expect(output.map((b) => [b.id, b.type, b.depth, b.text])).toEqual(
      input.map((b) => [b.id, b.type, b.depth, b.text])
    );
    expect(output[0].level).toBe(2);
  });

  test('a list item that jumps too deep is moved up', () => {
    const tree = buildTree([flat('a', 'listItem', 'a', 3)]);
    expect(tree[0].type).toBe('list');
    expect(tree[0].children[0].blockId).toBe('a');
  });

  test('bad data from a client is repaired (ids, types, levels)', () => {
    const tree = buildTree([
      flat('same', 'paragraph'),
      flat('same', 'paragraph'),
      flat('bad id <script>', 'paragraph'),
      { id: 'x1', type: 'hacker' as BlockType, depth: 0, text: 't' },
      { id: 'x2', type: 'heading', depth: 0, text: 't', level: 99 },
    ]);
    const ids = tree.map((n) => n.blockId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[A-Za-z0-9-]{1,64}$/.test(id))).toBe(true);
    expect(tree[3].type).toBe('paragraph');
    expect(tree[4].level).toBe(6);
  });

  test('limits the number of blocks', () => {
    const many = Array.from({ length: 1500 }, (_, i) => flat(`b${i}`, 'paragraph'));
    expect(buildTree(many).length).toBe(1000);
  });
});

describe('Document pre-save hook (recursive AST validation)', () => {
  const node = (id: string, type: BlockType, children: IBlockNode[] = [], text = id): IBlockNode => ({
    blockId: id,
    type,
    text,
    parentId: null,
    depth: 0,
    path: '',
    children,
  });

  test('accepts a valid tree and fills parentId / depth / path', async () => {
    const { error, doc } = await runSaveHook([node('L', 'list', [node('i1', 'listItem'), node('i2', 'listItem', [node('i3', 'listItem')])])]);
    expect(error).toBeFalsy();
    const i3 = doc.blocks[0].children[1].children[0];
    expect([i3.parentId, i3.depth, i3.path]).toEqual(['i2', 2, 'L/i2/i3']);
  });

  test.each([
    ['duplicate ids', [node('x', 'paragraph'), node('x', 'quote')], /Duplicate/],
    ['orphan list item', [node('i', 'listItem')], /inside a list/],
    ['paragraph with children', [node('p', 'paragraph', [node('q', 'paragraph')])], /cannot have children/],
    ['list with a paragraph', [node('L', 'list', [node('p', 'paragraph')])], /only contain listItem/],
  ])('rejects %s', async (_name, blocks, message) => {
    const { error } = await runSaveHook(blocks as IBlockNode[]);
    expect(error?.message).toMatch(message);
  });

  test('rejects a tree that is nested too deep', async () => {
    let deep = node('d6', 'listItem');
    for (let i = 5; i >= 1; i--) deep = node(`d${i}`, 'listItem', [deep]);
    const { error } = await runSaveHook([node('L', 'list', [deep])]);
    expect(error?.message).toMatch(/too deep/);
  });

  test('removes xss from block text and title before saving', async () => {
    const { error, doc } = await runSaveHook(
      [node('p', 'paragraph', [], '<img src=x onerror=alert(1)>Hi <script>alert(2)</script>')],
      '<b>Title</b><script>x</script>'
    );
    expect(error).toBeFalsy();
    expect(doc.blocks[0].text).toBe('Hi ');
    expect(doc.title).toBe('Title');
  });
});

describe('Markdown <-> JSON', () => {
  const md = [
    '# Spec',
    '',
    'First line',
    'second line.',
    '',
    '- one',
    '  - nested',
    '- two',
    '',
    '> a quote',
    '',
    '```',
    'let a = 1;',
    '```',
    '',
  ].join('\n');

  test('Markdown is mapped to the right blocks', () => {
    const blocks = markdownToBlocks(md);
    expect(blocks.map((b) => [b.type, b.depth, b.text])).toEqual([
      ['heading', 0, 'Spec'],
      ['paragraph', 0, 'First line second line.'],
      ['listItem', 0, 'one'],
      ['listItem', 1, 'nested'],
      ['listItem', 0, 'two'],
      ['quote', 0, 'a quote'],
      ['codeBlock', 0, 'let a = 1;'],
    ]);
    expect(blocks[0].level).toBe(1);
  });

  test('JSON -> Markdown -> JSON keeps the structure', () => {
    const blocks = markdownToBlocks(md);
    const again = markdownToBlocks(blocksToMarkdown(blocks));
    expect(again.map((b) => [b.type, b.depth, b.text, b.level])).toEqual(
      blocks.map((b) => [b.type, b.depth, b.text, b.level])
    );
  });

  test('code containing ``` is exported with a longer fence', () => {
    const out = blocksToMarkdown([flat('c', 'codeBlock', 'a\n```\nb')]);
    expect(out.startsWith('~~~~')).toBe(true);
  });
});
