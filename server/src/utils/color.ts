const COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#008080', '#9a6324', '#d81b60'];

// same id -> same color (used for presence, cursors and locks)
export function colorForId(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum = (sum + id.charCodeAt(i) * (i + 1)) % 100000;
  }
  return COLORS[sum % COLORS.length];
}
