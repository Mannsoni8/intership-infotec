import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';
import { transformIndex } from './deltas';
import { applyTextChange } from './textDiff';
import { stabilizeRecord } from './stable';
import { cursorReducer } from '../context/CursorContext';

describe('transformIndex (caret stays in place when others edit)', () => {
  test('text inserted before the caret moves it right', () => {
    expect(transformIndex(5, [{ insert: 'abc' }, { retain: 10 }])).toBe(8);
  });
  test('text inserted after the caret changes nothing', () => {
    expect(transformIndex(5, [{ retain: 7 }, { insert: 'abc' }])).toBe(5);
  });
  test('text inserted exactly at the caret: caret stays before it', () => {
    expect(transformIndex(5, [{ retain: 5 }, { insert: 'abc' }])).toBe(5);
  });
  test('text deleted before the caret moves it left', () => {
    expect(transformIndex(8, [{ retain: 2 }, { delete: 3 }])).toBe(5);
  });
  test('a deletion that contains the caret puts it at the start of the deletion', () => {
    expect(transformIndex(5, [{ retain: 3 }, { delete: 10 }])).toBe(3);
  });
  test('several changes at once', () => {
    expect(transformIndex(10, [{ insert: 'xx' }, { retain: 4 }, { delete: 2 }, { retain: 1 }, { insert: 'y' }])).toBe(11); // 10 + 2 - 2 + 1
  });
  test('works with a real Y.Text and a remote edit', () => {
    const local = new Y.Doc();
    const remote = new Y.Doc();
    local.getText('t').insert(0, 'hello world');
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(local));

    let caret = 11; // the user is at the end: "hello world|"
    local.getText('t').observe((event) => {
      caret = transformIndex(caret, event.delta as never);
    });
    remote.getText('t').insert(0, 'Oh! '); // somebody types at the start
    Y.applyUpdate(local, Y.encodeStateAsUpdate(remote));

    expect(local.getText('t').toString()).toBe('Oh! hello world');
    expect(caret).toBe(15); // still at the end
  });
});

describe('applyTextChange', () => {
  test('applies only the difference, so concurrent edits survive', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    a.getText('t').insert(0, 'hello world');
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    // user A changes "world" to "there", user B adds "!" at the end at the same time
    applyTextChange(a.getText('t'), 'hello there');
    applyTextChange(b.getText('t'), 'hello world!');
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    expect(a.getText('t').toString()).toBe(b.getText('t').toString());
    expect(a.getText('t').toString()).toContain('!');
    expect(a.getText('t').toString()).toContain('there');
  });

  test('handles insert, delete and replace', () => {
    const doc = new Y.Doc();
    const text = doc.getText('t');
    applyTextChange(text, 'abc');
    applyTextChange(text, 'abXc');
    applyTextChange(text, 'ac');
    applyTextChange(text, 'zzz');
    expect(text.toString()).toBe('zzz');
  });
});

describe('stabilizeRecord', () => {
  test('keeps old objects when the content is the same', () => {
    const prev = { a: { n: 1 }, b: { n: 2 } };
    const next = { a: { n: 1 }, b: { n: 2 } };
    expect(stabilizeRecord(prev, next)).toBe(prev);
  });
  test('only changed entries get new objects', () => {
    const prev = { a: { n: 1 }, b: { n: 2 } };
    const result = stabilizeRecord(prev, { a: { n: 1 }, b: { n: 3 } });
    expect(result).not.toBe(prev);
    expect(result.a).toBe(prev.a);
    expect(result.b).toEqual({ n: 3 });
  });
  test('removed keys are noticed', () => {
    expect(Object.keys(stabilizeRecord({ a: 1, b: 2 }, { a: 1 }))).toEqual(['a']);
  });
});

describe('cursorReducer (atomic cursor state)', () => {
  const start = { blockId: null, anchor: 0, head: 0 };
  test('select replaces the whole cursor in one step', () => {
    expect(cursorReducer(start, { type: 'select', blockId: 'b1', anchor: 2, head: 6 })).toEqual({ blockId: 'b1', anchor: 2, head: 6 });
  });
  test('selecting the same place returns the same state object', () => {
    const s = cursorReducer(start, { type: 'select', blockId: 'b1', anchor: 2, head: 6 });
    expect(cursorReducer(s, { type: 'select', blockId: 'b1', anchor: 2, head: 6 })).toBe(s);
  });
  test('a blur of another block does not clear the cursor', () => {
    const s = cursorReducer(start, { type: 'select', blockId: 'b2', anchor: 1, head: 1 });
    expect(cursorReducer(s, { type: 'blur', blockId: 'b1' })).toBe(s);
    expect(cursorReducer(s, { type: 'blur', blockId: 'b2' }).blockId).toBeNull();
  });
});
