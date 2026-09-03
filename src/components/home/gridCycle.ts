// A cycle must end at BOTH a collection boundary and a complete row.
export function gridCycleLength(itemCount: number, columns: number, minimumRows = 1): number {
  if (itemCount < 1 || columns < 1) return 0
  let a = itemCount
  let b = columns
  while (b) [a, b] = [b, a % b]
  const period = itemCount * columns / a
  return period * Math.max(1, Math.ceil(minimumRows * columns / period))
}
