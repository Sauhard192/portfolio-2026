// Match the CSS column-edge background in both lens captures.
export function paintBackgroundGrid(
  ctx: CanvasRenderingContext2D, style: CSSStyleDeclaration, width: number, height: number,
) {
  if (style.backgroundImage === 'none') return
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
  const length = (name: string) => {
    const value = style.getPropertyValue(name).trim()
    return parseFloat(value) * (value.endsWith('rem') ? rootSize : 1)
  }
  const columns = Number(style.getPropertyValue('--background-columns'))
  const margin = length('--layout-gutter')
  const gap = length('--background-column-gap')
  const step = (width - 2 * margin + gap) / columns
  ctx.fillStyle = style.getPropertyValue('--color-grid-line')
  for (let column = 0; column < columns; column++) {
    const left = margin + column * step
    ctx.fillRect(left, 0, 1, height)
    ctx.fillRect(left + step - gap - 1, 0, 1, height)
  }
}
