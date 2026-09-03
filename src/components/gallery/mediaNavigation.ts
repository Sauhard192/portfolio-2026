export const wrapMediaIndex = (index: number, count: number) =>
  count > 0 ? ((index % count) + count) % count : -1

export const mediaDateLabel = (date: string, location?: string) =>
  [location?.trim(), date].filter(Boolean).join(' · ')

export function getSwipeDirection(deltaX: number, deltaY: number, elapsed: number) {
  if (elapsed > 1000 || Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return 0
  return deltaX < 0 ? 1 : -1
}
