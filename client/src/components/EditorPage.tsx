import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, downloadExport, getToken } from '../api';
import { useAuth } from '../context/AuthContext';
import { CursorProvider, useCursorState } from '../context/CursorContext';
import { useCollabDoc } from '../hooks/useCollabDoc';
import { focusBlock } from '../utils/dom';
import { BlockType, DocInfo, RemoteCursor } from '../types';
import Block, { BlockOps } from './Block';
import PresenceBar from './PresenceBar';
import SharePanel from './SharePanel';

const NO_CURSORS: RemoteCursor[] = [];

function Editor({ docId }: { docId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = getToken() ?? '';

  const [info, setInfo] = useState<DocInfo | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [newType, setNewType] = useState<BlockType>('paragraph');

  const collab = useCollabDoc(docId, token, { name: user?.name ?? 'Guest', color: user?.color ?? '#888888' });
  const cursor = useCursorState();
  const {
    blocks, locks, cursors, status, closeReason, peers, myClientId,
    acquireLock, releaseLock, setLocalCursor, insertBlockAfter, splitBlock, deleteBlock, changeType, setLevel, changeDepth,
  } = collab;

  // the title, owner and collaborators come from the normal rest api
  useEffect(() => {
    api
      .getDoc(docId)
      .then((doc) => {
        setInfo(doc);
        setTitleDraft(doc.title);
      })
      .catch((err: Error) => setError(err.message));
  }, [docId]);

  // my local cursor (from the cursor context) is shared with the other users
  useEffect(() => {
    setLocalCursor(cursor.blockId, cursor.anchor, cursor.head);
  }, [cursor, setLocalCursor]);

  // after creating / deleting a block, put the caret in the right block
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const pendingFocus = useRef<{ id: string; where: 'start' | 'end' } | null>(null);
  useEffect(() => {
    const pending = pendingFocus.current;
    if (pending && blocks.some((b) => b.id === pending.id)) {
      pendingFocus.current = null;
      requestAnimationFrame(() => focusBlock(pending.id, pending.where));
    }
  }, [blocks]);

  const ops = useMemo<BlockOps>(
    () => ({
      acquire: acquireLock,
      release: releaseLock,
      split: (id, index) => {
        const newId = splitBlock(id, index);
        if (newId) pendingFocus.current = { id: newId, where: 'start' };
      },
      remove: (id, focusPrevious) => {
        const list = blocksRef.current;
        if (list.length <= 1) return; // a document always keeps one block
        const index = list.findIndex((b) => b.id === id);
        if (focusPrevious && index > 0) pendingFocus.current = { id: list[index - 1].id, where: 'end' };
        deleteBlock(id);
      },
      changeType,
      setLevel,
      changeDepth,
      focusNeighbor: (id, direction) => {
        const list = blocksRef.current;
        const target = list[list.findIndex((b) => b.id === id) + direction];
        return target ? focusBlock(target.id, direction < 0 ? 'end' : 'start') : false;
      },
    }),
    [acquireLock, releaseLock, splitBlock, deleteBlock, changeType, setLevel, changeDepth]
  );

  const handleAddBlock = () => {
    const last = blocksRef.current[blocksRef.current.length - 1];
    const id = insertBlockAfter(last ? last.id : null, newType);
    pendingFocus.current = { id, where: 'start' };
  };

  const handleRename = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!info || info.role !== 'owner' || titleDraft.trim() === info.title) return;
    if (!titleDraft.trim()) {
      setTitleDraft(info.title);
      return;
    }
    try {
      setInfo(await api.renameDoc(info._id, titleDraft.trim()));
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const handleExport = async (format: 'pdf' | 'html' | 'md') => {
    try {
      setNotice('');
      await downloadExport(docId, format, info?.title || 'document');
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const handleLeave = async () => {
    if (!user || !window.confirm('Leave this document? You will lose access to it.')) return;
    try {
      await api.unshareDoc(docId, user.id);
      navigate('/');
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  if (error) {
    return (
      <div>
        <p className="error">{error}</p>
        <Link to="/">Back to documents</Link>
      </div>
    );
  }

  const isOwner = info?.role === 'owner';
  const activeIndex = blocks.findIndex((b) => b.id === cursor.blockId);

  return (
    <div>
      <Link to="/" className="back-link">
        &lt; Back
      </Link>

      <div className="doc-header">
        {isOwner ? (
          <form onSubmit={handleRename}>
            <input
              className="title-input"
              value={titleDraft}
              maxLength={120}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void handleRename()}
              aria-label="Document title"
            />
          </form>
        ) : (
          <h1>{info?.title ?? 'Loading...'}</h1>
        )}
        <div className="header-buttons">
          {isOwner && (
            <button type="button" onClick={() => setShowShare((v) => !v)}>
              Share
            </button>
          )}
          {info && !isOwner && (
            <button type="button" className="danger" onClick={handleLeave}>
              Leave
            </button>
          )}
          <button type="button" className="secondary" onClick={() => handleExport('pdf')}>
            PDF
          </button>
          <button type="button" className="secondary" onClick={() => handleExport('html')}>
            HTML
          </button>
          <button type="button" className="secondary" onClick={() => handleExport('md')}>
            Markdown
          </button>
        </div>
      </div>

      {notice && <p className="error">{notice}</p>}
      {info && isOwner && showShare && <SharePanel info={info} onChange={setInfo} />}

      <PresenceBar peers={peers} myClientId={myClientId} status={status} />
      {status === 'denied' && (
        <p className="error">
          {closeReason || 'You do not have access to this document.'} <Link to="/">Back to documents</Link>
        </p>
      )}

      <div className="editor">
        {blocks.length === 0 && status === 'connected' && <p className="muted">This document is empty. Add a block below.</p>}
        {blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            lock={locks[block.id]}
            remoteCursors={cursors[block.id] ?? NO_CURSORS}
            myClientId={myClientId}
            ops={ops}
          />
        ))}
      </div>

      <div className="add-block">
        <select value={newType} onChange={(e) => setNewType(e.target.value as BlockType)} aria-label="New block type">
          <option value="paragraph">Text</option>
          <option value="heading">Heading</option>
          <option value="listItem">List item</option>
          <option value="quote">Quote</option>
          <option value="codeBlock">Code</option>
        </select>
        <button type="button" onClick={handleAddBlock} disabled={status !== 'connected'}>
          + Add block
        </button>
      </div>

      <p className="status-bar muted">
        {activeIndex === -1
          ? 'Click a block to start typing. Enter = new block, Tab = indent list item.'
          : `Block ${activeIndex + 1} of ${blocks.length} - cursor at ${cursor.head}${
              cursor.anchor !== cursor.head ? ` (${Math.abs(cursor.anchor - cursor.head)} selected)` : ''
            }`}
      </p>
    </div>
  );
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  // the key makes a fresh editor (and a fresh cursor state) for every document
  return (
    <CursorProvider key={id}>
      <Editor docId={id ?? ''} />
    </CursorProvider>
  );
}
