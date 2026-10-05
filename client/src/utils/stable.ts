// Returns the OLD object when the new one has the same content.
// React.memo components get the same props again, so they do not re-render.
export function stabilizeRecord<T>(prev: Record<string, T>, next: Record<string, T>): Record<string, T> {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  let changed = prevKeys.length !== nextKeys.length;
  const result: Record<string, T> = {};

  for (const key of nextKeys) {
    if (key in prev && JSON.stringify(prev[key]) === JSON.stringify(next[key])) {
      result[key] = prev[key];
    } else {
      result[key] = next[key];
      changed = true;
    }
  }
  return changed ? result : prev;
}
