import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { FlatBlock } from '../utils/blockTree';
import { BLOCK_TYPES, BlockType } from '../models/Document';

// message types used on the websocket.
// 0 and 1 are the normal yjs ones, 4 is our own message for block locking
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MSG_LOCK = 4;

export interface SyncUser {
  id: string;
  name: string;
  color: string;
}

// everything the sync server needs from the outside (database + login)
export interface SyncDeps {
  authenticate(token: string | null): Promise<SyncUser | null>;
  canAccess(docId: string, userId: string): Promise<boolean>;
  loadBlocks(docId: string): Promise<FlatBlock[] | null>;
  saveBlocks(docId: string, blocks: FlatBlock[]): Promise<void>;
}

export interface SyncOptions {
  allowedOrigins?: string[];
  saveDelayMs?: number; // how often live edits are saved to mongodb
  roomIdleMs?: number; // how long an empty room stays in memory
  maxConnectionsPerRoom?: number;
}

export interface SyncHandle {
  flushRoom(docId: string): Promise<void>;
  flushAll(): Promise<void>;
  evictRoom(docId: string): void;
  kickUser(docId: string, userId: string): void;
  close(): Promise<void>;
}

// info about who holds the lock of a block
interface LockInfo {
  clientId: number; // awareness client id of the user
  name: string;
  color: string;
}

interface LockRequest {
  action: 'acquire' | 'release';
  blockId: string;
}

interface ConnInfo {
  ids: Set<number>; // awareness ids that this socket controls
  user: SyncUser;
}

// one room = one document that people are editing together
interface Room {
  docId: string;
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, ConnInfo>;
  locks: Map<string, { info: LockInfo; socket: WebSocket }>; // blockId -> owner
  saveTimer: NodeJS.Timeout | null;
  savePromise: Promise<void>;
  failures: number;
  idleTimer: NodeJS.Timeout | null;
  destroyed: boolean;
}

const DOC_ID_PATTERN = /^[a-f0-9]{24}$/i;
const BLOCK_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const MAX_AWARENESS_IDS_PER_SOCKET = 5;

// ---------- helpers that read / write the yjs structure ----------
// structure:  blocks (Y.Array) -> block (Y.Map: id, type, depth, level, text as Y.Text)

function fillYDoc(ydoc: Y.Doc, blocks: FlatBlock[]): void {
  const yBlocks = ydoc.getArray<Y.Map<unknown>>('blocks');
  ydoc.transact(() => {
    for (const b of blocks) {
      const yBlock = new Y.Map<unknown>();
      yBlock.set('id', b.id);
      yBlock.set('type', b.type);
      yBlock.set('depth', b.depth);
      yBlock.set('level', b.level ?? 1);
      yBlock.set('text', new Y.Text(b.text));
      yBlocks.push([yBlock]);
    }
  });
}

// yjs content comes from clients, so every value is checked before it is used
export function readFlat(ydoc: Y.Doc): FlatBlock[] {
  const result: FlatBlock[] = [];
  for (const yBlock of ydoc.getArray<Y.Map<unknown>>('blocks').toArray()) {
    const type = yBlock.get('type');
    const text = yBlock.get('text');
    const depth = yBlock.get('depth');
    const level = yBlock.get('level');
    result.push({
      id: String(yBlock.get('id')),
      type: BLOCK_TYPES.includes(type as BlockType) ? (type as BlockType) : 'paragraph',
      depth: typeof depth === 'number' ? depth : 0,
      level: typeof level === 'number' ? level : 1,
      text: text instanceof Y.Text ? text.toString() : '',
    });
  }
  return result;
}

function toBytes(raw: RawData): Uint8Array {
  if (Buffer.isBuffer(raw)) return new Uint8Array(raw);
  if (Array.isArray(raw)) return new Uint8Array(Buffer.concat(raw));
  return new Uint8Array(raw);
}

function send(ws: WebSocket, message: Uint8Array): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  }
}

function lockMessage(room: Room): Uint8Array {
  const table: Record<string, LockInfo> = {};
  room.locks.forEach((value, blockId) => {
    table[blockId] = value.info;
  });
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MSG_LOCK);
  encoding.writeVarString(encoder, JSON.stringify({ locks: table }));
  return encoding.toUint8Array(encoder);
}

function broadcastLocks(room: Room): void {
  const message = lockMessage(room);
  room.conns.forEach((_info, ws) => send(ws, message));
}

export function attachSyncServer(server: HttpServer, deps: SyncDeps, options: SyncOptions = {}): SyncHandle {
  const saveDelayMs = options.saveDelayMs ?? 2000;
  const roomIdleMs = options.roomIdleMs ?? 60000;
  const maxConnections = options.maxConnectionsPerRoom ?? 30;

  // maxPayload: a client can not send huge messages
  const wss = new WebSocketServer({ server, maxPayload: 1024 * 1024 });
  const rooms = new Map<string, Promise<Room | null>>();

  // ---------- saving to mongodb ----------

  function saveNow(room: Room): Promise<void> {
    if (room.saveTimer) {
      clearTimeout(room.saveTimer);
      room.saveTimer = null;
    }
    // saves run one after another, never at the same time
    room.savePromise = room.savePromise.then(async () => {
      try {
        await deps.saveBlocks(room.docId, readFlat(room.ydoc));
        room.failures = 0;
      } catch (err) {
        room.failures++;
        console.error(`Could not save document ${room.docId}:`, (err as Error).message);
        if (room.failures < 5 && !room.destroyed) scheduleSave(room); // try again later
      }
    });
    return room.savePromise;
  }

  function scheduleSave(room: Room): void {
    if (room.saveTimer || room.destroyed) return;
    room.saveTimer = setTimeout(() => {
      room.saveTimer = null;
      void saveNow(room);
    }, saveDelayMs);
    room.saveTimer.unref();
  }

  function destroyRoom(room: Room): void {
    room.destroyed = true;
    if (room.saveTimer) clearTimeout(room.saveTimer);
    if (room.idleTimer) clearTimeout(room.idleTimer);
    rooms.delete(room.docId);
    room.awareness.destroy();
    room.ydoc.destroy();
  }

  // ---------- rooms ----------

  async function createRoom(docId: string): Promise<Room | null> {
    const blocks = await deps.loadBlocks(docId);
    if (blocks === null) return null; // document does not exist

    const ydoc = new Y.Doc();
    fillYDoc(ydoc, blocks);
    const awareness = new awarenessProtocol.Awareness(ydoc);
    awareness.setLocalState(null); // the server itself is not a user

    const room: Room = {
      docId,
      ydoc,
      awareness,
      conns: new Map(),
      locks: new Map(),
      saveTimer: null,
      savePromise: Promise.resolve(),
      failures: 0,
      idleTimer: null,
      destroyed: false,
    };

    // whenever the document changes: send the update to everyone and save it soon
    ydoc.on('update', (update: Uint8Array) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      room.conns.forEach((_info, ws) => send(ws, message));
      scheduleSave(room);
    });

    // whenever presence changes (name, cursor ...): send it to everyone
    awareness.on(
      'update',
      (changes: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        const changed = changes.added.concat(changes.updated, changes.removed);

        // remember which ids belong to which socket, to clean up when it disconnects
        if (origin instanceof WebSocket) {
          const conn = room.conns.get(origin);
          if (conn) {
            changes.added.forEach((id) => conn.ids.add(id));
            changes.removed.forEach((id) => conn.ids.delete(id));
            if (conn.ids.size > MAX_AWARENESS_IDS_PER_SOCKET) {
              origin.close(1008, 'Too many users on one connection');
            }
          }
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_AWARENESS);
        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
        const message = encoding.toUint8Array(encoder);
        room.conns.forEach((_info, ws) => send(ws, message));
      }
    );

    return room;
  }

  function getRoom(docId: string): Promise<Room | null> {
    let promise = rooms.get(docId);
    if (!promise) {
      promise = createRoom(docId);
      rooms.set(docId, promise);
      promise.then((room) => {
        if (!room && rooms.get(docId) === promise) rooms.delete(docId);
      }, () => rooms.delete(docId));
    }
    return promise;
  }

  // ---------- locking ----------

  function releaseLocksOf(room: Room, ws: WebSocket): boolean {
    let changed = false;
    room.locks.forEach((value, blockId) => {
      if (value.socket === ws) {
        room.locks.delete(blockId);
        changed = true;
      }
    });
    return changed;
  }

  function blockExists(room: Room, blockId: string): boolean {
    return room.ydoc
      .getArray<Y.Map<unknown>>('blocks')
      .toArray()
      .some((b) => b.get('id') === blockId);
  }

  // The name and color in a lock come from the logged in user, NOT from the client message.
  // A user holds only one lock at a time (the block that has the cursor).
  function handleLock(room: Room, ws: WebSocket, request: LockRequest): void {
    const conn = room.conns.get(ws);
    const clientId = conn ? Array.from(conn.ids)[0] : undefined;
    if (!conn || clientId === undefined) return;

    const current = room.locks.get(request.blockId);

    if (request.action === 'acquire') {
      if (!blockExists(room, request.blockId)) return;
      if (current && current.socket !== ws) {
        // somebody else has it: only tell this user the real state again
        send(ws, lockMessage(room));
        return;
      }
      releaseLocksOf(room, ws);
      room.locks.set(request.blockId, {
        socket: ws,
        info: { clientId, name: conn.user.name, color: conn.user.color },
      });
    } else if (current && current.socket === ws) {
      room.locks.delete(request.blockId); // only the owner can release
    }
    broadcastLocks(room);
  }

  function parseLockRequest(text: string): LockRequest | null {
    try {
      const data: unknown = JSON.parse(text);
      if (typeof data !== 'object' || data === null) return null;
      const { action, blockId } = data as Record<string, unknown>;
      if ((action !== 'acquire' && action !== 'release') || typeof blockId !== 'string') return null;
      if (!BLOCK_ID_PATTERN.test(blockId)) return null;
      return { action, blockId };
    } catch {
      return null;
    }
  }

  // ---------- messages ----------

  function handleMessage(room: Room, ws: WebSocket, data: Uint8Array): void {
    try {
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MSG_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, room.ydoc, ws);
        // if there is a reply (sync step 2) send it back to this client only
        if (encoding.length(encoder) > 1) {
          send(ws, encoding.toUint8Array(encoder));
        }
      } else if (messageType === MSG_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), ws);
      } else if (messageType === MSG_LOCK) {
        const request = parseLockRequest(decoding.readVarString(decoder));
        if (request) handleLock(room, ws, request);
      }
    } catch (err) {
      console.error('Bad websocket message:', (err as Error).message);
    }
  }

  function handleClose(room: Room, ws: WebSocket): void {
    const conn = room.conns.get(ws);
    room.conns.delete(ws);

    // remove the presence of this user
    if (conn) {
      awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(conn.ids), null);
    }
    // free all the blocks locked by this user
    if (releaseLocksOf(room, ws)) broadcastLocks(room);

    // nobody is left: save now, and remove the room from memory after a while
    if (room.conns.size === 0 && !room.destroyed) {
      void saveNow(room);
      room.idleTimer = setTimeout(() => {
        if (room.conns.size === 0) {
          void saveNow(room).then(() => {
            if (room.conns.size === 0) destroyRoom(room);
          });
        }
      }, roomIdleMs);
      room.idleTimer.unref();
    }
  }

  // ---------- new connections ----------

  wss.on('connection', (ws: WebSocket, req) => {
    ws.on('error', () => undefined); // never crash because of one bad socket

    // messages can arrive before login is checked, so they wait in a small queue
    const queue: Uint8Array[] = [];
    let room: Room | null = null;
    (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    ws.on('pong', () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });
    ws.on('message', (raw: RawData) => {
      const data = toBytes(raw);
      if (room) handleMessage(room, ws, data);
      else if (queue.length < 50) queue.push(data);
    });
    ws.on('close', () => {
      if (room) handleClose(room, ws);
    });

    const setup = async (): Promise<void> => {
      // 1. origin check (browsers always send it)
      const origin = req.headers.origin;
      if (options.allowedOrigins && origin && !options.allowedOrigins.includes(origin)) {
        ws.close(1008, 'Origin not allowed');
        return;
      }

      // 2. url: ws://host/<documentId>?token=<jwt>
      const url = new URL(req.url ?? '/', 'http://localhost');
      let docId = '';
      try {
        docId = decodeURIComponent(url.pathname.slice(1));
      } catch {
        docId = '';
      }
      if (!DOC_ID_PATTERN.test(docId)) {
        ws.close(1008, 'Bad document id');
        return;
      }

      // 3. who is this, and may this person open this document?
      const user = await deps.authenticate(url.searchParams.get('token'));
      if (!user) {
        ws.close(1008, 'Please log in again');
        return;
      }
      if (!(await deps.canAccess(docId, user.id))) {
        ws.close(1008, 'No access to this document');
        return;
      }

      // 4. get (or create) the room
      let found = await getRoom(docId);
      if (found && found.destroyed) found = await getRoom(docId);
      if (!found) {
        ws.close(1008, 'Document not found');
        return;
      }
      if (ws.readyState !== WebSocket.OPEN) return; // user left while we were checking
      if (found.conns.size >= maxConnections) {
        ws.close(1013, 'Too many people in this document');
        return;
      }

      const joined = found;
      if (joined.idleTimer) {
        clearTimeout(joined.idleTimer);
        joined.idleTimer = null;
      }
      joined.conns.set(ws, { ids: new Set(), user });

      // step 1: ask the client what it has (normal yjs handshake)
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeSyncStep1(encoder, joined.ydoc);
      send(ws, encoding.toUint8Array(encoder));

      // who is already online
      const states = joined.awareness.getStates();
      if (states.size > 0) {
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, MSG_AWARENESS);
        encoding.writeVarUint8Array(
          awarenessEncoder,
          awarenessProtocol.encodeAwarenessUpdate(joined.awareness, Array.from(states.keys()))
        );
        send(ws, encoding.toUint8Array(awarenessEncoder));
      }
      send(ws, lockMessage(joined)); // the current locks

      room = joined;
      queue.forEach((data) => handleMessage(joined, ws, data));
      queue.length = 0;
    };

    setup().catch((err: Error) => {
      console.error('Websocket setup failed:', err.message);
      ws.close(1011, 'Server error');
    });
  });

  // every 30 seconds: close connections that do not answer (so locks and presence are freed)
  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      const socket = client as WebSocket & { isAlive?: boolean };
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);
  heartbeat.unref();

  async function withRoom(docId: string, action: (room: Room) => void | Promise<void>): Promise<void> {
    const promise = rooms.get(docId);
    const room = promise ? await promise : null;
    if (room && !room.destroyed) await action(room);
  }

  return {
    flushRoom: (docId) => withRoom(docId, (room) => saveNow(room)),

    flushAll: async () => {
      await Promise.all(Array.from(rooms.keys()).map((id) => withRoom(id, (room) => saveNow(room))));
    },

    // document deleted: disconnect everybody and forget the room (nothing is saved)
    evictRoom: (docId) => {
      void withRoom(docId, (room) => {
        const sockets = Array.from(room.conns.keys());
        destroyRoom(room);
        sockets.forEach((ws) => ws.close(1000, 'Document deleted'));
      });
    },

    // user lost access: close his connections
    kickUser: (docId, userId) => {
      void withRoom(docId, (room) => {
        room.conns.forEach((conn, ws) => {
          if (conn.user.id === userId) ws.close(1008, 'Your access was removed');
        });
      });
    },

    close: async () => {
      clearInterval(heartbeat);
      await Promise.all(Array.from(rooms.keys()).map((id) => withRoom(id, (room) => saveNow(room))));
      wss.clients.forEach((client) => client.terminate());
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}
