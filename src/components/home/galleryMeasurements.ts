import { gridCycleLength } from './gridCycle'

export function measureGridCycle(cycle: HTMLElement, projectCount: number) {
  const card = cycle.querySelector<HTMLElement>('.project-card')
  if (!card) return null
  const style = getComputedStyle(cycle)
  const columns = Math.max(1, Number.parseInt(style.getPropertyValue('--gallery-columns')) || 4)
  const rowStep = card.offsetHeight + (Number.parseFloat(style.rowGap) || 0)
  const minimumRows = Math.ceil(window.innerHeight / Math.max(1, rowStep)) + 1
  return { count: gridCycleLength(projectCount, columns, minimumRows), cardWidth: card.offsetWidth }
}

function availableListSpace(gallery: HTMLElement) {
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  const gap = Number.parseFloat(getComputedStyle(gallery).getPropertyValue('--space-5')) * rootFontSize
  let top = gap
  let bottom = window.innerHeight - gap
  const controls = gallery.closest('.home-page')?.querySelectorAll<HTMLElement>(
    '.home-logo, .home-nav, .menu-toggle, .view-switcher, .project-filter__trigger',
  )

  // Reserve visible header and bottom controls, plus the existing spacing token.
  controls?.forEach(control => {
    const style = getComputedStyle(control)
    const bounds = control.getBoundingClientRect()
    if (style.display === 'none' || style.visibility === 'hidden' || !bounds.height) return
    if (bounds.bottom <= window.innerHeight / 2) top = Math.max(top, bounds.bottom + gap)
    else if (bounds.top >= window.innerHeight / 2) bottom = Math.min(bottom, bounds.top - gap)
  })
  return { top, bottom }
}

export function measureBoundedList(gallery: HTMLElement, cycle: HTMLElement) {
  const items = Array.from(cycle.querySelectorAll<HTMLElement>('.project-list-item'))
  const first = items[0]
  const last = items.at(-1)
  if (!first || !last) return null

  const { top, bottom } = availableListSpace(gallery)
  const firstCenter = first.offsetTop + first.offsetHeight / 2
  const lastCenter = last.offsetTop + last.offsetHeight / 2
  const height = last.offsetTop + last.offsetHeight - first.offsetTop
  const fits = height <= Math.max(0, bottom - top)
  return {
    fits,
    focusCenter: fits ? (top + bottom) / 2 : window.innerHeight / 2,
    start: fits ? top + (bottom - top - height) / 2 - first.offsetTop : window.innerHeight / 2 - firstCenter,
    scrollRange: fits ? 0 : Math.max(0, lastCenter - firstCenter),
  }
}
