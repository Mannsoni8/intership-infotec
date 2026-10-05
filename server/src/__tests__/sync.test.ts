import http from 'http';
import { AddressInfo } from 'net';
import WebSocket from 'ws';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebsocketProvider } from 'y-websocket';
import { attachSyncServer, readFlat, SyncHandle, SyncUser } from '../sync/syncServer';
import { FlatBlock } from '../utils/blockTree';

const DOC = 'aaaaaaaaaaaaaaaaaaaaaaaa'; // looks like a mongo id
const OTHER_DOC = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- a fake database and login, so these tests do not need mongodb ----
const saved: FlatBlock[][] = [];
const revoked = new Set<string>();
const initial: FlatBlock[] = [
  { id: 'title', type: 'heading', depth: 0, text: 'Spec', level: 1 },
  { id: 'shared', type: 'paragraph', depth: 0, text: '' },
];

function userFor(token: string | null): SyncUser | null {
  if (!token || !token.startsWith('tok-')) return null;
  return { id: token.slice(4), name: `User ${token.slice(4)}`, color: '#336699' };
}

let server: http.Server;
let sync: SyncHandle;
let port: number;

beforeAll(async () => {
  server = http.createServer();
  sync = attachSyncServer(
    server,
    {
      authenticate: async (token) => userFor(token),
      canAccess: async (docId, userId) => docId === DOC && userId !== 'outsider' && !revoked.has(userId),
      loadBlocks: async (docId) => (docId === DOC ? initial.map((b) => ({ ...b })) : null),
      saveBlocks: async (_docId, blocks) => {
        saved.push(blocks);
      },
    },
    { saveDelayMs: 150, roomIdleMs: 500, allowedOrigins: ['http://localhost:5173'] }
  );
  await new Promise<void>((resolve) => server.listen(0, resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await sync.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

interface Client {
  doc: Y.Doc;
  provider: WebsocketProvider;
  locks: Record<string, { clientId: number; name: string }>;
  blocks: Y.Array<Y.Map<unknown>>;
}

const created: Client[] = [];
afterEach(async () => {
  created.splice(0).forEach((c) => {
    c.provider.destroy();
    c.provider.awareness.destroy(); // provider.destroy() does not stop the awareness timer
    c.doc.destroy();
  });
  await sleep(150);
});

function connect(user: string, docId = DOC): Client {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(`ws://localhost:${port}`, docId, doc, {
    WebSocketPolyfill: WebSocket as never,
    disableBc: true,
    params: { token: `tok-${user}` },
  });
  provider.awareness.setLocalStateField('user', { name: `User ${user}`, color: '#336699' });
  const client: Client = { doc, provider, locks: {}, blocks: doc.getArray<Y.Map<unknown>>('blocks') };
  provider.messageHandlers[4] = (_enc, decoder) => {
    client.locks = (JSON.parse(decoding.readVarString(decoder)) as { locks: Client['locks'] }).locks;
  };
  created.push(client);
  return client;
}

function sendLock(c: Client, action: 'acquire' | 'release', blockId: string): void {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 4);
  encoding.writeVarString(encoder, JSON.stringify({ action, blockId }));
  c.provider.ws?.send(encoding.toUint8Array(encoder));
}

function textOf(c: Client, id: string): string {
  const block = c.blocks.toArray().find((b) => b.get('id') === id);
  return (block?.get('text') as Y.Text).toString();
}

// resolves with the close code when the server refuses the connection
function expectRejected(url: string, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    ws.on('close', (code) => resolve(code));
    ws.on('error', () => undefined);
  });
}

describe('Mid-project review: 10 concurrent clients', () => {
  test('conflict resolution: nobody loses an edit and all clients end up identical', async () => {
    const N = 10;
    const clients = Array.from({ length: N }, (_, i) => connect(`u${i}`));
    await sleep(800);
    expect(clients.every((c) => c.blocks.length === 2)).toBe(true);

    // all clients work at the SAME time:
    //  - everybody types into the same paragraph
    //  - everybody adds its own block (code block / paragraph)
    //  - everybody edits the heading
    clients.forEach((c, i) => {
      const shared = c.blocks.get(1).get('text') as Y.Text;
      for (let k = 0; k < 5; k++) shared.insert(i % 2 === 0 ? 0 : shared.length, `[${i}.${k}]`);

      const heading = c.blocks.get(0).get('text') as Y.Text;
      heading.insert(heading.length, `<${i}>`);

      c.doc.transact(() => {
        const block = new Y.Map<unknown>();
        block.set('id', `own-${i}`);
        block.set('type', i % 2 === 0 ? 'codeBlock' : 'paragraph');
        block.set('depth', 0);
        block.set('level', 1);
        block.set('text', new Y.Text(`block from client ${i}`));
        c.blocks.push([block]);
      });
    });
    await sleep(1500);

    // 1. every client sees exactly the same document
    const states = clients.map((c) => JSON.stringify(readFlat(c.doc)));
    expect(new Set(states).size).toBe(1);

    // 2. nothing was lost
    const first = clients[0];
    expect(first.blocks.length).toBe(2 + N);
    for (let i = 0; i < N; i++) {
      expect(textOf(first, `own-${i}`)).toBe(`block from client ${i}`);
      expect(textOf(first, 'title')).toContain(`<${i}>`);
      for (let k = 0; k < 5; k++) expect(textOf(first, 'shared')).toContain(`[${i}.${k}]`);
    }

    // 3. the live document was saved to the database (autosave) and matches
    await sleep(400);
    expect(saved.length).toBeGreaterThan(0);
    expect(JSON.stringify(saved[saved.length - 1])).toBe(states[0]);

    // 4. no character was lost: the length is exactly the sum of everything that was typed
    const typed = Array.from({ length: N }, (_, i) =>
      Array.from({ length: 5 }, (_k, k) => `[${i}.${k}]`.length).reduce((a, b) => a + b, 0)
    ).reduce((a, b) => a + b, 0);
    expect(textOf(first, 'shared').length).toBe(typed);
  });
});

describe('block locking', () => {
  test('one user holds a block, others cannot take it, and it is freed on disconnect', async () => {
    const a = connect('lock-a');
    const b = connect('lock-b');
    await sleep(600);

    sendLock(a, 'acquire', 'shared');
    await sleep(250);
    sendLock(b, 'acquire', 'shared');
    await sleep(250);
    expect(b.locks.shared.clientId).toBe(a.provider.awareness.clientID);
    expect(b.locks.shared.name).toBe('User lock-a'); // name comes from the login, not from the client

    sendLock(b, 'release', 'shared'); // not the owner: must be ignored
    await sleep(250);
    expect(b.locks.shared).toBeDefined();

    sendLock(a, 'acquire', 'title'); // taking another block frees the first one
    await sleep(250);
    expect(b.locks.shared).toBeUndefined();
    expect(b.locks.title).toBeDefined();

    sendLock(a, 'acquire', 'does-not-exist'); // unknown blocks are ignored
    sendLock(a, 'acquire', '<script>');
    await sleep(250);
    expect(Object.keys(b.locks)).toEqual(['title']);

    a.provider.destroy();
    await sleep(400);
    expect(b.locks.title).toBeUndefined();
    expect(b.provider.awareness.getStates().size).toBe(1); // presence of a is gone too
  });
});

describe('security of the websocket', () => {
  test('rejects missing / wrong tokens', async () => {
    expect(await expectRejected(`ws://localhost:${port}/${DOC}`)).toBe(1008);
    expect(await expectRejected(`ws://localhost:${port}/${DOC}?token=garbage`)).toBe(1008);
  });

  test('rejects a logged in user who has no access to the document', async () => {
    expect(await expectRejected(`ws://localhost:${port}/${DOC}?token=tok-outsider`)).toBe(1008);
  });

  test('rejects unknown documents and bad document ids', async () => {
    expect(await expectRejected(`ws://localhost:${port}/${OTHER_DOC}?token=tok-x`)).toBe(1008);
    expect(await expectRejected(`ws://localhost:${port}/..%2F..%2Fetc?token=tok-x`)).toBe(1008);
  });

  test('rejects browsers coming from another website', async () => {
    const code = await expectRejected(`ws://localhost:${port}/${DOC}?token=tok-x`, { Origin: 'http://evil.example' });
    expect(code).toBe(1008);
  });

  test('kickUser closes the connections of a user who lost access', async () => {
    const victim = connect('victim');
    await sleep(500);
    expect(victim.provider.wsconnected).toBe(true);
    revoked.add('victim'); // the owner removed him (the api does this before calling kickUser)
    sync.kickUser(DOC, 'victim');
    await sleep(600); // the browser client tries to reconnect, but is refused now
    expect(victim.provider.wsconnected).toBe(false);
  });
});
