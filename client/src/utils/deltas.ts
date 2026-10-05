// one operation of a Y.Text delta
export interface DeltaOp {
  insert?: string | object;
  delete?: number;
  retain?: number;
}

// Moves a cursor position through a change made by someone else, so the caret stays at the
// same place in the text (this is what keeps your typing from jumping when others edit).
// Example: someone inserts 3 letters before your caret -> your caret moves 3 to the right.
export function transformIndex(index: number, delta: DeltaOp[]): number {
  let position = 0; // position in the OLD text
  let result = index;

  for (const op of delta) {
    if (op.retain !== undefined) {
      position += op.retain;
    } else if (op.insert !== undefined) {
      const length = typeof op.insert === 'string' ? op.insert.length : 1;
      // inserted before the caret: move right (inserted exactly at the caret: caret stays)
      if (position < index) result += length;
    } else if (op.delete !== undefined) {
      // deleted text before the caret: move left (but never further than the start of the deletion)
      if (index > position) result -= Math.min(op.delete, index - position);
      position += op.delete;
    }
    if (position > index && op.insert === undefined) break; // nothing after this can affect the caret
  }
  return Math.max(0, result);
}
