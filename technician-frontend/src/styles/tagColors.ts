import { colors } from '../colors.generated';

// Preserve stored tag data; render legacy or unknown colors through the neutral palette.
export function neutralTagColors(savedColor: string) {
  const supported: string[] = [colors.ink, colors.secondary, colors.link, colors.muted];
  const text = supported.includes(savedColor) ? savedColor : colors.ink;
  return { bg: text === colors.link ? colors.activeSurface : colors.page, text };
}
