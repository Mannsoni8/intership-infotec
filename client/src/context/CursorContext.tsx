import { createContext, useContext, useMemo, useReducer, ReactNode } from 'react';

// the local cursor: which block, and where inside the block (as plain text positions)
export interface CursorState {
  blockId: string | null;
  anchor: number; // where the selection started
  head: number; // where the caret is
}

type CursorAction =
  | { type: 'select'; blockId: string; anchor: number; head: number }
  | { type: 'blur'; blockId: string };

interface CursorActions {
  select: (blockId: string, anchor: number, head: number) => void;
  blur: (blockId: string) => void;
}

const EMPTY: CursorState = { blockId: null, anchor: 0, head: 0 };

// every change is one atomic update of the whole cursor
export function cursorReducer(state: CursorState, action: CursorAction): CursorState {
  switch (action.type) {
    case 'select':
      // same place again: return the same object so nothing re-renders
      if (state.blockId === action.blockId && state.anchor === action.anchor && state.head === action.head) {
        return state;
      }
      return { blockId: action.blockId, anchor: action.anchor, head: action.head };
    case 'blur':
      // only clear when the block that lost focus is the one that has the cursor
      return state.blockId === action.blockId ? EMPTY : state;
    default:
      return state;
  }
}

const CursorStateContext = createContext<CursorState>(EMPTY);
const CursorActionsContext = createContext<CursorActions | null>(null);

export function CursorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cursorReducer, EMPTY);
  const actions = useMemo<CursorActions>(
    () => ({
      select: (blockId, anchor, head) => dispatch({ type: 'select', blockId, anchor, head }),
      blur: (blockId) => dispatch({ type: 'blur', blockId }),
    }),
    []
  );
  return (
    <CursorActionsContext.Provider value={actions}>
      <CursorStateContext.Provider value={state}>{children}</CursorStateContext.Provider>
    </CursorActionsContext.Provider>
  );
}

export function useCursorState(): CursorState {
  return useContext(CursorStateContext);
}

export function useCursorActions(): CursorActions {
  const actions = useContext(CursorActionsContext);
  if (!actions) throw new Error('useCursorActions must be used inside CursorProvider');
  return actions;
}
