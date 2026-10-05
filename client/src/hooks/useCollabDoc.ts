import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import {
  BlockType,
  BlockView,
  CollabUser,
  ConnectionStatus,
  LockTable,
  Peer,
  RemoteCursor,
} from '../types';
import { stabilizeRecord } from '../utils/stable';

const WS_URL =
  import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5000`;

// same number as MSG_LOCK on the server
const MSG_LOCK = 4;
const MAX_ITEM_DEPTH = 4;
const BLOCK_TYPES: BlockType[] = ['heading', 'paragraph', 'codeBlock', 'quote', 'listItem'];
const NO_CURSORS: Record<string, RemoteCursor[]> = {};

// everything that arrives from other users is untrusted, so it is checked before it is used
function isBlockType(value: unknown): value is BlockType {
  return BLOCK_TYPES.includes(value as BlockType);
}
function isUser(value: unknown): value is CollabUser {
  const u = value as CollabUser | null;
  return !!u && typeof u === 'object' && typeof u.name === 'string' && typeof u.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(u.color);
}
interface RawCursor {
  blockId: string;
  anchor: unknown;
  head: unknown;
}
function isCursor(value: unknown): value is RawCursor {
  const c = value as RawCursor | null;
  return !!c && typeof c === 'object' && typeof c.blockId === 'string' && c.anchor !== undefined && c.head !== undefined;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function newBlockMap(id: string, type: BlockType, text: string, depth = 0, level = 1): Y.Map<unknown> {
  const block = new Y.Map<unknown>();
  block.set('id', id);
  block.set('type', type);
  block.set('depth', depth);
  block.set('level', level);
  block.set('text', new Y.Text(text));
  return block;
}

// connects to the yjs websocket and gives back everything the editor needs
export function useCollabDoc(docId: string, token: string, user: CollabUser) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [closeReason, setCloseReason] = useState('');
  const [blocks, setBlocks] = useState<BlockView[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [locks, setLocks] = useState<LockTable>({});
  const [cursors, setCursors] = useState<Record<string, RemoteCursor[]>>(NO_CURSORS);
  const [myClientId, setMyClientId] = useState<number | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const userRef = useRef<CollabUser>(user);
  userRef.current = user;

  useEffect(() => {
    const ydoc = new Y.Doc();
    // the login token goes in the url (browsers can not set headers for websockets).
    // disableBc: everything goes through our server (two tabs do not talk to each other directly)
    const provider = new WebsocketProvider(WS_URL, docId, ydoc, { disableBc: true, params: { token } });
    ydocRef.current = ydoc;
    providerRef.current = provider;
    setMyClientId(provider.awareness.clientID);
    setStatus('connecting');
    provider.awareness.setLocalStateField('user', userRef.current);

    // 1. connection status. Close code 1008 = the server refused us (no login / no access)
    provider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setStatus((previous) => (previous === 'denied' ? previous : event.status));
    });
    provider.on('connection-close', (event: CloseEvent | null) => {
      if (event && event.code === 1008) {
        setCloseReason(event.reason || 'Access denied');
        setStatus('denied');
        provider.disconnect(); // do not try to reconnect
      } else if (event && event.code === 1000 && event.reason) {
        setCloseReason(event.reason);
        setStatus('denied');
        provider.disconnect();
      }
    });

    // 2. blocks. The list is rebuilt only when blocks are added / removed / changed type,
    // text typing is handled inside each Block component (so typing does not re-render the page)
    const yBlocks = ydoc.getArray<Y.Map<unknown>>('blocks');
    const readBlocks = () => {
      setBlocks((previous) => {
        const old = new Map(previous.map((b) => [b.id, b]));
        const list: BlockView[] = [];
        for (const yBlock of yBlocks.toArray()) {
          const text = yBlock.get('text');
          if (!(text instanceof Y.Text)) continue;
          const type = yBlock.get('type');
          const block: BlockView = {
            id: String(yBlock.get('id')),
            type: isBlockType(type) ? type : 'paragraph',
            depth: numberOr(yBlock.get('depth'), 0),
            level: numberOr(yBlock.get('level'), 1),
            text,
          };
          // reuse the old object when nothing changed, so React.memo can skip that block
          const before = old.get(block.id);
          const same =
            before &&
            before.type === block.type &&
            before.depth === block.depth &&
            before.level === block.level &&
            before.text === block.text;
          list.push(same ? before : block);
        }
        const unchanged = list.length === previous.length && list.every((b, i) => b === previous[i]);
        return unchanged ? previous : list;
      });
    };
    yBlocks.observeDeep((events) => {
      if (events.some((event) => !(event.target instanceof Y.Text))) readBlocks();
    });
    readBlocks();

    // 3. presence and cursors of the other users
    const readAwareness = () => {
      const peerList: Peer[] = [];
      const byBlock: Record<string, RemoteCursor[]> = {};
      provider.awareness.getStates().forEach((state, clientId) => {
        if (!isUser(state.user)) return;
        peerList.push({ clientId, name: state.user.name, color: state.user.color });
        if (clientId !== provider.awareness.clientID && isCursor(state.cursor)) {
          (byBlock[state.cursor.blockId] ||= []).push({
            clientId,
            name: state.user.name,
            color: state.user.color,
            blockId: state.cursor.blockId,
            anchor: state.cursor.anchor,
            head: state.cursor.head,
          });
        }
      });
      setPeers(peerList);
      setCursors((previous) => stabilizeRecord(previous, byBlock));
    };
    provider.awareness.on('change', readAwareness);
    readAwareness();

    // 4. the lock table sent by the server
    provider.messageHandlers[MSG_LOCK] = (_encoder, decoder) => {
      try {
        const data = JSON.parse(decoding.readVarString(decoder)) as { locks?: LockTable };
        if (data.locks && typeof data.locks === 'object') {
          const table = data.locks;
          setLocks((previous) => stabilizeRecord(previous, table));
        }
      } catch {
        /* ignore a broken message */
      }
    };

    return () => {
      provider.destroy();
      provider.awareness.destroy(); // provider.destroy() does not stop the awareness timer
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
    };
  }, [docId, token]);

  // ---------- actions ----------

  const sendLock = useCallback((action: 'acquire' | 'release', blockId: string) => {
    const provider = providerRef.current;
    if (!provider || !provider.ws || !provider.wsconnected) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_LOCK);
    // the server decides the name and color itself, we only say which block
    encoding.writeVarString(encoder, JSON.stringify({ action, blockId }));
    provider.ws.send(encoding.toUint8Array(encoder));
  }, []);

  const acquireLock = useCallback((blockId: string) => sendLock('acquire', blockId), [sendLock]);
  const releaseLock = useCallback((blockId: string) => sendLock('release', blockId), [sendLock]);

  // shares where my cursor / selection is (as yjs relative positions, so it follows the text)
  const setLocalCursor = useCallback((blockId: string | null, anchor: number, head: number) => {
    const provider = providerRef.current;
    const ydoc = ydocRef.current;
    if (!provider || !ydoc) return;
    if (blockId === null) {
      provider.awareness.setLocalStateField('cursor', null);
      return;
    }
    const yBlock = ydoc
      .getArray<Y.Map<unknown>>('blocks')
      .toArray()
      .find((b) => b.get('id') === blockId);
    const text = yBlock?.get('text');
    if (!(text instanceof Y.Text)) return;
    provider.awareness.setLocalStateField('cursor', {
      blockId,
      anchor: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, Math.min(anchor, text.length))),
      head: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, Math.min(head, text.length))),
    });
  }, []);

  const withBlocks = useCallback(<T,>(action: (ydoc: Y.Doc, yBlocks: Y.Array<Y.Map<unknown>>) => T): T | null => {
    const ydoc = ydocRef.current;
    return ydoc ? action(ydoc, ydoc.getArray<Y.Map<unknown>>('blocks')) : null;
  }, []);

  // an item can only be 1 level deeper than the item before it
  const fixListDepths = (yBlocks: Y.Array<Y.Map<unknown>>, fromIndex: number) => {
    const all = yBlocks.toArray();
    for (let i = Math.max(fromIndex, 0); i < all.length; i++) {
      const block = all[i];
      if (block.get('type') !== 'listItem') break;
      const previous = all[i - 1];
      const max = previous && previous.get('type') === 'listItem' ? numberOr(previous.get('depth'), 0) + 1 : 0;
      if (numberOr(block.get('depth'), 0) > max) block.set('depth', max);
    }
  };

  // adds a block after another block (or at the end when afterId is null). Returns the new id
  const insertBlockAfter = useCallback(
    (afterId: string | null, type: BlockType, text = '', depth = 0): string => {
      const id = crypto.randomUUID();
      withBlocks((ydoc, yBlocks) => {
        ydoc.transact(() => {
          const index = afterId ? yBlocks.toArray().findIndex((b) => b.get('id') === afterId) + 1 : yBlocks.length;
          yBlocks.insert(Math.max(index, 0), [newBlockMap(id, type, text, depth)]);
        });
      });
      return id;
    },
    [withBlocks]
  );

  // Enter in the middle of a block: the text after the caret moves to a new block
  const splitBlock = useCallback(
    (blockId: string, index: number): string | null =>
      withBlocks((ydoc, yBlocks) => {
        const all = yBlocks.toArray();
        const position = all.findIndex((b) => b.get('id') === blockId);
        if (position === -1) return null;
        const source = all[position];
        const text = source.get('text');
        if (!(text instanceof Y.Text)) return null;

        const cut = Math.min(Math.max(index, 0), text.length);
        const tail = text.toString().slice(cut);
        const isItem = source.get('type') === 'listItem';
        const id = crypto.randomUUID();
        ydoc.transact(() => {
          if (tail) text.delete(cut, tail.length);
          yBlocks.insert(position + 1, [
            newBlockMap(id, isItem ? 'listItem' : 'paragraph', tail, isItem ? numberOr(source.get('depth'), 0) : 0),
          ]);
        });
        return id;
      }),
    [withBlocks]
  );

  const deleteBlock = useCallback(
    (blockId: string) => {
      withBlocks((ydoc, yBlocks) => {
        const index = yBlocks.toArray().findIndex((m) => m.get('id') === blockId);
        if (index === -1) return;
        ydoc.transact(() => {
          yBlocks.delete(index, 1);
          fixListDepths(yBlocks, index);
        });
      });
    },
    [withBlocks]
  );

  const changeType = useCallback(
    (blockId: string, type: BlockType) => {
      withBlocks((ydoc, yBlocks) => {
        const index = yBlocks.toArray().findIndex((m) => m.get('id') === blockId);
        if (index === -1) return;
        ydoc.transact(() => {
          const block = yBlocks.get(index);
          block.set('type', type);
          if (type !== 'listItem') block.set('depth', 0);
          if (type === 'heading' && typeof block.get('level') !== 'number') block.set('level', 1);
          fixListDepths(yBlocks, index);
        });
      });
    },
    [withBlocks]
  );

  const setLevel = useCallback(
    (blockId: string, level: number) => {
      withBlocks((_ydoc, yBlocks) => {
        yBlocks
          .toArray()
          .find((m) => m.get('id') === blockId)
          ?.set('level', Math.min(6, Math.max(1, level)));
      });
    },
    [withBlocks]
  );

  // Tab / Shift+Tab on a list item
  const changeDepth = useCallback(
    (blockId: string, delta: number) => {
      withBlocks((ydoc, yBlocks) => {
        const all = yBlocks.toArray();
        const index = all.findIndex((m) => m.get('id') === blockId);
        if (index === -1 || all[index].get('type') !== 'listItem') return;
        const previous = all[index - 1];
        const max = previous && previous.get('type') === 'listItem' ? numberOr(previous.get('depth'), 0) + 1 : 0;
        const wanted = numberOr(all[index].get('depth'), 0) + delta;
        ydoc.transact(() => {
          all[index].set('depth', Math.min(Math.max(wanted, 0), Math.min(max, MAX_ITEM_DEPTH)));
          fixListDepths(yBlocks, index + 1);
        });
      });
    },
    [withBlocks]
  );

  return useMemo(
    () => ({
      status,
      closeReason,
      blocks,
      peers,
      locks,
      cursors,
      myClientId,
      acquireLock,
      releaseLock,
      setLocalCursor,
      insertBlockAfter,
      splitBlock,
      deleteBlock,
      changeType,
      setLevel,
      changeDepth,
    }),
    [status, closeReason, blocks, peers, locks, cursors, myClientId, acquireLock, releaseLock, setLocalCursor, insertBlockAfter, splitBlock, deleteBlock, changeType, setLevel, changeDepth]
  );
}
