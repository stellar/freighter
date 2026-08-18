export interface FontSizeStep {
  maxLen: number;
  sizePx: number;
}

/**
 * Picks a size from a length-ordered scale: the first step whose maxLen covers
 * the value's length. The scale's final step must be a catch-all
 * (maxLen: Infinity) so a match is always found.
 */
export const fitFontSizePx = (
  value: string,
  scale: readonly FontSizeStep[],
): number => scale.find(({ maxLen }) => value.length <= maxLen)!.sizePx;

/** Shrinks the "X CODE available" line as it gets longer so it never wraps. */
export const AVAILABLE_BALANCE_FONT_SIZES: readonly FontSizeStep[] = [
  { maxLen: 28, sizePx: 14 },
  { maxLen: 42, sizePx: 12 },
  { maxLen: Infinity, sizePx: 11 },
];

export const getAvailableBalanceFontSizePx = (text: string): number =>
  fitFontSizePx(text, AVAILABLE_BALANCE_FONT_SIZES);
