// One viewport of extra scrolling after the footer reaches the top.
export const NEXT_PROJECT_SCROLL_SCREENS = 2

export function nextProjectIndex(index: number, count: number) {
  return count > 1 && index >= 0 && index < count ? (index + 1) % count : -1
}

export function footerProgress(scroll: number, start: number, distance: number) {
  const covered = scroll - start
  // Browser scroll limits round fractional pixels; don't get stuck at 99.99%.
  if (covered > 0 && covered >= Math.max(1, distance) - 1) return 1
  return Math.max(0, Math.min(1, covered / Math.max(1, distance)))
}
