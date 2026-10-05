// puts the caret in the textarea of a block
export function focusBlock(blockId: string, where: 'start' | 'end'): boolean {
  const element = document.querySelector<HTMLTextAreaElement>(`[data-block-id="${CSS.escape(blockId)}"] textarea`);
  if (!element) return false;
  element.focus();
  const position = where === 'start' ? 0 : element.value.length;
  element.setSelectionRange(position, position);
  return true;
}
