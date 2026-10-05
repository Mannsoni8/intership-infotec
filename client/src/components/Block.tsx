import { memo, useEffect, useLayoutEffect, useRef, useState, ChangeEvent, KeyboardEvent } from 'react';
import { BlockType, BlockView, LockInfo, RemoteCursor } from '../types';
import { useCursorActions } from '../context/CursorContext';
import { transformIndex } from '../utils/deltas';
import { applyTextChange } from '../utils/textDiff';
import CursorLayer from './CursorLayer';

// the actions a block can do (one stable object for all blocks)
export interface BlockOps {
  acquire: (id: string) => void;
  release: (id: string) => void;
  split: (id: string, index: number) => void;
  remove: (id: string, focusPrevious: boolean) => void;
  changeType: (id: string, type: BlockType) => void;
  setLevel: (id: string, level: number) => void;
  changeDepth: (id: string, delta: number) => void;
  focusNeighbor: (id: string, direction: -1 | 1) => boolean;
}

interface Props {
  block: BlockView;
  lock: LockInfo | undefined;
  remoteCursors: RemoteCursor[];
  myClientId: number | null;
  ops: BlockOps;
}

interface PendingSelection {
  start: number;
  end: number;
  direction: 'forward' | 'backward' | 'none';
}

// One block of the document. It is wrapped in memo(), so when somebody types in another block
// this one does not re-render (only the changed AST node is updated on screen).
function Block({ block, lock, remoteCursors, myClientId, ops }: Props) {
  const cursor = useCursorActions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<PendingSelection | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const [value, setValue] = useState(block.text.toString());
  const [focused, setFocused] = useState(false);
  const [flash, setFlash] = useState(false);

  const lockedByOther = lock !== undefined && lock.clientId !== myClientId;

  // when the text changes, update the textarea
  useEffect(() => {
    const onChange = (event: { delta: unknown; transaction: { local: boolean } }) => {
      const element = textareaRef.current;
      const remote = !event.transaction.local;

      // Somebody else changed the text while I am typing here: move my caret with the change,
      // otherwise the browser would throw it to the end of the text.
      if (remote && element && document.activeElement === element) {
        const delta = event.delta as Parameters<typeof transformIndex>[1];
        pendingSelection.current = {
          start: transformIndex(element.selectionStart, delta),
          end: transformIndex(element.selectionEnd, delta),
          direction: element.selectionDirection ?? 'none',
        };
      }
      setValue(block.text.toString());

      // short highlight so people see which block was changed by someone else
      if (remote) {
        setFlash(true);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(false), 1200);
      }
    };
    block.text.observe(onChange);
    setValue(block.text.toString());
    return () => {
      block.text.unobserve(onChange);
      window.clearTimeout(flashTimer.current);
    };
  }, [block.text]);

  // grow the textarea with its text, and put the caret back after a remote change
  const resize = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };
  useLayoutEffect(() => {
    resize();
    const element = textareaRef.current;
    const selection = pendingSelection.current;
    if (element && selection) {
      element.setSelectionRange(selection.start, selection.end, selection.direction);
      pendingSelection.current = null;
    }
  }, [value, block.type, block.level]);
  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // tells the others where my caret / selection is
  const reportSelection = () => {
    const element = textareaRef.current;
    if (!element) return;
    const backward = element.selectionDirection === 'backward';
    cursor.select(
      block.id,
      backward ? element.selectionEnd : element.selectionStart,
      backward ? element.selectionStart : element.selectionEnd
    );
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    applyTextChange(block.text, event.target.value);
    reportSelection();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || lockedByOther) return; // do not break IME typing
    const element = event.currentTarget;
    const start = element.selectionStart;
    const end = element.selectionEnd;

    if (event.key === 'Enter' && !event.shiftKey && block.type !== 'codeBlock') {
      event.preventDefault();
      if (block.type === 'listItem' && element.value === '') {
        ops.changeType(block.id, 'paragraph'); // Enter on an empty item leaves the list
        return;
      }
      if (end > start) block.text.delete(start, end - start); // typing over a selection
      ops.split(block.id, start);
    } else if (event.key === 'Backspace' && element.value === '') {
      event.preventDefault();
      ops.remove(block.id, true);
    } else if (event.key === 'Tab' && block.type === 'listItem') {
      event.preventDefault();
      ops.changeDepth(block.id, event.shiftKey ? -1 : 1);
    } else if (event.key === 'ArrowUp' && start === 0 && end === 0) {
      if (ops.focusNeighbor(block.id, -1)) event.preventDefault();
    } else if (event.key === 'ArrowDown' && start === element.value.length && end === element.value.length) {
      if (ops.focusNeighbor(block.id, 1)) event.preventDefault();
    }
  };

  const typeClass = `type-${block.type} level-${block.level}`;
  const stateClass = [
    'block',
    focused ? 'block-mine' : '',
    lockedByOther ? 'block-locked' : '',
    flash ? 'block-flash' : '',
  ].join(' ');

  return (
    <div
      className={stateClass}
      data-block-id={block.id}
      style={{ marginLeft: block.depth * 24, ['--lock-color' as string]: lock?.color }}
    >
      {lockedByOther && lock && (
        <span className="lock-badge" style={{ background: lock.color }}>
          {lock.name} is editing
        </span>
      )}

      {block.type === 'listItem' && <span className="bullet">{block.depth % 2 === 0 ? '•' : '◦'}</span>}

      <div className="block-field">
        <CursorLayer text={block.text} value={value} cursors={remoteCursors} className={typeClass} />
        <textarea
          ref={textareaRef}
          className={`field-text ${typeClass}`}
          value={value}
          rows={1}
          maxLength={10000}
          spellCheck={block.type !== 'codeBlock'}
          placeholder={block.type === 'codeBlock' ? 'Write some code...' : 'Type something...'}
          readOnly={lockedByOther}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={reportSelection}
          onClick={reportSelection}
          onSelect={reportSelection}
          onFocus={() => {
            setFocused(true);
            ops.acquire(block.id);
            reportSelection();
          }}
          onBlur={() => {
            setFocused(false);
            ops.release(block.id);
            cursor.blur(block.id);
          }}
        />
      </div>

      <div className="block-tools">
        <select
          value={block.type}
          disabled={lockedByOther}
          aria-label="Block type"
          onChange={(e) => ops.changeType(block.id, e.target.value as BlockType)}
        >
          <option value="paragraph">Text</option>
          <option value="heading">Heading</option>
          <option value="listItem">List item</option>
          <option value="quote">Quote</option>
          <option value="codeBlock">Code</option>
        </select>
        {block.type === 'heading' && (
          <select
            value={Math.min(block.level, 3)}
            disabled={lockedByOther}
            aria-label="Heading level"
            onChange={(e) => ops.setLevel(block.id, Number(e.target.value))}
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
        )}
        {block.type === 'listItem' && (
          <>
            <button type="button" title="Outdent (Shift+Tab)" disabled={lockedByOther} onClick={() => ops.changeDepth(block.id, -1)}>
              &larr;
            </button>
            <button type="button" title="Indent (Tab)" disabled={lockedByOther} onClick={() => ops.changeDepth(block.id, 1)}>
              &rarr;
            </button>
          </>
        )}
        <button type="button" className="danger" title="Delete block" disabled={lockedByOther} onClick={() => ops.remove(block.id, false)}>
          &times;
        </button>
      </div>
    </div>
  );
}

export default memo(Block);
