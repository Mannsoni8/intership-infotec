import * as Y from 'yjs';

// Finds what changed between the old and new text and applies ONLY that change to the Y.Text.
// (Replacing the whole text on every key press would overwrite what other users type.)
export function applyTextChange(ytext: Y.Text, newValue: string): void {
  const oldValue = ytext.toString();
  if (oldValue === newValue) return;

  let start = 0;
  while (start < oldValue.length && start < newValue.length && oldValue[start] === newValue[start]) {
    start++;
  }

  let oldEnd = oldValue.length;
  let newEnd = newValue.length;
  while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const change = () => {
    if (oldEnd > start) ytext.delete(start, oldEnd - start);
    if (newEnd > start) ytext.insert(start, newValue.slice(start, newEnd));
  };
  if (ytext.doc) ytext.doc.transact(change);
  else change();
}
