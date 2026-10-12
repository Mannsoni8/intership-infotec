import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, downloadExport, getToken } from '../api';
import { useAuth } from '../context/AuthContext';
import { CursorProvider, useCursorState } from '../context/CursorContext';
import { useCollabDoc } from '../hooks/useCollabDoc';
import { focusBlock } from '../utils/dom';
import { BlockType, DocInfo, RemoteCursor } from '../types';
import Block, { BlockOps } from './Block';
import { EditorTopbar } from './editor/EditorTopbar';
import { CollaboratorAvatars } from './editor/CollaboratorAvatars';
import { BlockToolbar } from './editor/BlockToolbar';
import { ShareDialog } from './sharing/ShareDialog';
import { AlertCircle } from 'lucide-react';
import '../styles/editor.css';

const NO_CURSORS: RemoteCursor[] = [];

function Editor({ docId }: { docId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = getToken() ?? '';

  const [info, setInfo] = useState<DocInfo | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showShare, setShowShare] = useState(false);

  const collab = useCollabDoc(docId, token, {
    name: user?.name ?? 'Guest',
    color: user?.color ?? '#888888',
  });
  const cursor = useCursorState();
  const {
    blocks,
    locks,
    cursors,
    status,
    closeReason,
    peers,
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
  } = collab;

  // Retrieve title, owner and collaborators via REST API
  useEffect(() => {
    api
      .getDoc(docId)
      .then((doc) => {
        setInfo(doc);
      })
      .catch((err: Error) => setError(err.message));
  }, [docId]);

  // Sync cursor selection with peers
  useEffect(() => {
    setLocalCursor(cursor.blockId, cursor.anchor, cursor.head);
  }, [cursor, setLocalCursor]);

  // Keep caret focus in the appropriate block after split or delete
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
        if (list.length <= 1) return; // a document always keeps at least one block
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

  const handleAddBlock = (type: BlockType = 'paragraph') => {
    const last = blocksRef.current[blocksRef.current.length - 1];
    const id = insertBlockAfter(last ? last.id : null, type);
    pendingFocus.current = { id, where: 'start' };
  };

  const handleRename = async (newTitle: string) => {
    if (!info || info.role !== 'owner') return;
    try {
      const updated = await api.renameDoc(info._id, newTitle);
      setInfo(updated);
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
      <div className="editor-error-screen animate-fade-in">
        <AlertCircle size={40} className="error-icon" />
        <h2>Unable to load document</h2>
        <p className="error">{error}</p>
        <Link to="/" className="back-btn-pill">
          Back to documents
        </Link>
      </div>
    );
  }

  const isOwner = info?.role === 'owner';
  const activeIndex = blocks.findIndex((b) => b.id === cursor.blockId);

  return (
    <div className="editor-page-container">
      <EditorTopbar
        info={info}
        onRename={handleRename}
        onShare={() => setShowShare(true)}
        onExport={handleExport}
        onLeave={handleLeave}
        statusIndicator={
          <CollaboratorAvatars
            peers={peers}
            myClientId={myClientId}
            status={status}
          />
        }
      />

      {notice && (
        <div className="editor-notice-bar">
          <AlertCircle size={15} />
          <span>{notice}</span>
          <button className="notice-dismiss" onClick={() => setNotice('')}>
            &times;
          </button>
        </div>
      )}

      {status === 'denied' && (
        <div className="editor-denied-banner animate-fade-in">
          <AlertCircle size={20} />
          <span>
            {closeReason || 'You do not have access to this document.'}
          </span>
          <Link to="/" className="denied-back-link">
            Return to documents
          </Link>
        </div>
      )}

      <div className="editor-canvas-wrapper">
        <div className="editor-canvas">
          {blocks.length === 0 && status === 'connected' && (
            <div className="editor-empty-hint">
              <p>This document is empty. Choose a block below to start typing.</p>
            </div>
          )}

          <div className="blocks-container">
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

          <BlockToolbar onAddBlock={handleAddBlock} disabled={status !== 'connected'} />
        </div>

        <div className="editor-footer-status">
          {activeIndex === -1 ? (
            <span>Click any block to edit. Enter = new block · Tab = indent list item · Backspace = delete empty block</span>
          ) : (
            <span>
              Block {activeIndex + 1} of {blocks.length} — Cursor position {cursor.head}
              {cursor.anchor !== cursor.head && ` (${Math.abs(cursor.anchor - cursor.head)} chars selected)`}
            </span>
          )}
        </div>
      </div>

      {info && isOwner && (
        <ShareDialog
          isOpen={showShare}
          docSummary={
            info
              ? {
                  _id: info._id,
                  title: info.title,
                  updatedAt: info.updatedAt,
                  blockCount: blocks.length,
                  role: info.role,
                  ownerName: info.owner.name,
                }
              : null
          }
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CursorProvider key={id}>
      <Editor docId={id ?? ''} />
    </CursorProvider>
  );
}
