import * as Y from 'yjs';
import { RemoteCursor } from '../types';

// turns a yjs relative position (sent by another user) into a number in the text.
// The data comes from another user, so a broken value must never crash the page.
function resolveIndex(text: Y.Text, relative: unknown): number | null {
  try {
    const doc = text.doc;
    if (!doc) return null;
    const absolute = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(relative), doc);
    return absolute && absolute.type === text ? absolute.index : null;
  } catch {
    return null;
  }
}

interface Props {
  text: Y.Text;
  value: string;
  cursors: RemoteCursor[];
  className: string; // same classes as the textarea, so the text wraps in exactly the same way
}

// Draws the carets and selections of other users. Every user gets one invisible copy of the
// text, placed exactly over the textarea. Only the caret and the selection color are visible.
function CursorLayer({ text, value, cursors, className }: Props) {
  return (
    <>
      {cursors.map((cursor) => {
        const rawHead = resolveIndex(text, cursor.head);
        if (rawHead === null) return null;
        const head = Math.min(rawHead, value.length);
        const anchor = Math.min(resolveIndex(text, cursor.anchor) ?? head, value.length);
        const start = Math.min(anchor, head);
        const end = Math.max(anchor, head);

        const caret = (
          <span className="caret" style={{ borderColor: cursor.color }}>
            <span className="caret-name" style={{ background: cursor.color }}>
              {cursor.name}
            </span>
          </span>
        );

        return (
          <div key={cursor.clientId} className={`cursor-layer ${className}`} aria-hidden="true">
            <span>{value.slice(0, start)}</span>
            {head < anchor && caret}
            {end > start && (
              <span className="remote-selection" style={{ background: `${cursor.color}44` }}>
                {value.slice(start, end)}
              </span>
            )}
            {head >= anchor && caret}
            {'\u200b'}
          </div>
        );
      })}
    </>
  );
}

export default CursorLayer;
