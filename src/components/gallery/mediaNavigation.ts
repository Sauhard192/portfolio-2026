export const wrapMediaIndex = (index: number, count: number) =>
  count > 0 ? ((index % count) + count) % count : -1

export function getSwipeDirection(deltaX: number, deltaY: number, elapsed: number) {
  if (elapsed > 1000 || Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return 0
  return deltaX < 0 ? 1 : -1
}

export function mediaDateTime(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return undefined
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}
