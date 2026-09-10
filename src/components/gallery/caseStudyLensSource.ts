// Rasterize only the two edge strips. The shared WebGL shader stays unchanged.
// This adapter supports the case-study renderer's text, images, and inset reveals.
type Box = { x: number; y: number; width: number; height: number }
type Line = Box & { text: string }
type Snapshot = { element: HTMLElement; rect: DOMRect; style: CSSStyleDeclaration; opacity: number; clips: Box[] }
const excluded = '.next-project__progress, .next-project__hit-area, .scramble-text__measure'
const transparent = (color: string) => color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
const intersects = (r: Box, y: number, height: number) => r.y + r.height > y && r.y < y + height
const pixels = (value: string, size: number) => parseFloat(value) * (value.endsWith('%') ? size / 100 : 1) || 0

export class CaseStudyLensSource {
  private elements: HTMLElement[]
  private lines = new WeakMap<Text, { key: string; lines: Line[] }>()
  private signature = ''

  constructor(private page: HTMLElement) {
    this.elements = Array.from(page.querySelectorAll<HTMLElement>('.case-study, .case-study *, .next-project, .next-project *'))
      .filter(element => !element.closest(excluded))
    // These tilted labels paint above the thumbnail, regardless of DOM order.
    this.elements.sort((a, b) => Number(a.matches('.next-project__label')) - Number(b.matches('.next-project__label')))
  }

  paint(ctx: CanvasRenderingContext2D, width: number, height: number, band: number, dpr: number) {
    const snapshots = new Map<HTMLElement, Snapshot>()
    const read = (element: HTMLElement): Snapshot => {
      const cached = snapshots.get(element)
      if (cached) return cached
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const parent = element.parentElement && element !== this.page ? read(element.parentElement) : undefined
      const clips = [...(parent?.clips ?? [])]
      const inset = style.clipPath.match(/^inset\(([^)]+)\)/)
      if (inset) {
        const values = inset[1].split(/\s+/)
        const top = pixels(values[0], rect.height), right = pixels(values[1] ?? values[0], rect.width)
        const bottom = pixels(values[2] ?? values[0], rect.height), left = pixels(values[3] ?? values[1] ?? values[0], rect.width)
        clips.push({ x: rect.x + left, y: rect.y + top, width: Math.max(0, rect.width - left - right), height: Math.max(0, rect.height - top - bottom) })
      }
      if (style.overflowX === 'hidden' || style.overflowY === 'hidden') clips.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
      const opacity = style.display === 'none' || style.visibility === 'hidden' ? 0 : Number(style.opacity) * (parent?.opacity ?? 1)
      const snapshot = { element, rect, style, opacity, clips }
      snapshots.set(element, snapshot)
      return snapshot
    }
    const records = this.elements.flatMap(element => {
      const r = element.getBoundingClientRect()
      if (!intersects(r, 0, band) && !intersects(r, height - band, band)) return []
      const record = read(element)
      return record.opacity > 0 && r.width > 0 && r.height > 0 ? [record] : []
    })
    const pageStyle = getComputedStyle(this.page)
    // Include masks and loading fades, even if scroll position hasn't changed.
    const signature = JSON.stringify([width, height, document.fonts.status, pageStyle.backgroundColor,
      records.map(({ element, rect: r, style: s, opacity, clips }) => [r.x, r.y, r.width, r.height, opacity,
        s.font, s.letterSpacing, s.color, s.backgroundColor, s.transform, clips,
        element instanceof HTMLImageElement ? [element.currentSrc, element.complete, s.objectPosition] :
          element instanceof HTMLVideoElement ? [element.currentSrc, element.readyState, element.currentTime, s.objectPosition] :
          Array.from(element.childNodes).filter(node => node instanceof Text).map(node => node.textContent).join('')])])
    const dynamic = records.some(({ element }) => element.matches('.image-skeleton') ||
      element.matches('img[data-lens-animated="true"]') ||
      (element instanceof HTMLVideoElement && !element.paused))
    if (signature === this.signature && !dynamic) return false
    this.signature = signature
    for (let bottom = 0; bottom < 2; bottom++) {
      const origin = bottom ? height - band : 0
      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, bottom * band * dpr)
      ctx.beginPath(); ctx.rect(0, 0, width, band); ctx.clip()
      ctx.fillStyle = pageStyle.backgroundColor
      ctx.fillRect(0, 0, width, band)
      if (pageStyle.backgroundImage !== 'none') {
        ctx.fillStyle = pageStyle.getPropertyValue('--color-grid-line')
        const step = width / (width <= 640 ? 8 : 24)
        for (let x = step - 1; x < width; x += step) ctx.fillRect(x, 0, 1, band)
      }
      ctx.translate(0, -origin)
      for (const record of records) {
        if (!intersects(record.rect, origin, band)) continue
        ctx.save()
        for (const clip of record.clips) {
          ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.width, clip.height); ctx.clip()
        }
        ctx.globalAlpha = record.opacity
        this.draw(ctx, record)
        ctx.restore()
      }
      ctx.restore()
    }
    return true
  }

  private draw(ctx: CanvasRenderingContext2D, { element, rect, style }: Snapshot) {
    const tilted = element.matches('.next-project__label')
    const sx = tilted ? 1 : rect.width / (element.offsetWidth || rect.width)
    const sy = tilted ? 1 : rect.height / (element.offsetHeight || rect.height)
    ctx.translate(rect.x, rect.y)
    if (tilted) {
      const m = new DOMMatrix(style.transform === 'none' ? undefined : style.transform)
      const w = element.offsetWidth, h = element.offsetHeight
      const x = Math.min(0, m.a * w, m.c * h, m.a * w + m.c * h)
      const y = Math.min(0, m.b * w, m.d * h, m.b * w + m.d * h)
      ctx.transform(m.a, m.b, m.c, m.d, -x, -y)
    } else ctx.scale(sx, sy)
    const w = tilted ? element.offsetWidth : rect.width / sx
    const h = tilted ? element.offsetHeight : rect.height / sy
    if (!transparent(style.backgroundColor)) {
      ctx.fillStyle = style.backgroundColor
      ctx.beginPath(); ctx.roundRect(0, 0, w, h, Math.min(parseFloat(style.borderRadius) || 0, w / 2, h / 2)); ctx.fill()
    }
    if (element.matches('.image-skeleton')) {
      const pseudo = getComputedStyle(element, '::after')
      const m = new DOMMatrix(pseudo.transform === 'none' ? undefined : pseudo.transform)
      const gradient = ctx.createLinearGradient(m.e, h * 0.4, m.e + w, h * 0.6)
      gradient.addColorStop(0.2, 'transparent')
      gradient.addColorStop(0.5, style.getPropertyValue('--image-skeleton-highlight').trim())
      gradient.addColorStop(0.8, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
    }
    if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) {
      const sourceWidth = element instanceof HTMLImageElement ? element.naturalWidth : element.videoWidth
      const sourceHeight = element instanceof HTMLImageElement ? element.naturalHeight : element.videoHeight
      if (element instanceof HTMLImageElement ? !element.complete || !sourceWidth : element.readyState < 2 || !sourceWidth) return
      const fit = style.objectFit === 'contain' ? Math.min : Math.max
      const scale = fit(w / sourceWidth, h / sourceHeight)
      const iw = sourceWidth * scale, ih = sourceHeight * scale
      const position = style.objectPosition.split(' ')
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip()
      ctx.drawImage(element, pixels(position[0], w - iw), pixels(position[1] ?? '50%', h - ih), iw, ih)
      return
    }
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
    ctx.fillStyle = style.color
    const metrics = ctx.measureText('Mg')
    const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.8
    const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.2
    if (tilted) {
      const lineHeight = parseFloat(style.lineHeight) || ascent + descent
      ctx.fillText(element.textContent ?? '', parseFloat(style.paddingLeft), parseFloat(style.paddingTop) + (lineHeight - ascent - descent) / 2 + ascent)
      return
    }
    for (const node of element.childNodes) {
      if (!(node instanceof Text) || !node.textContent?.trim()) continue
      for (const line of this.textLines(node, element, rect, sx, sy, style)) {
        const text = style.textTransform === 'uppercase' ? line.text.toUpperCase() : style.textTransform === 'lowercase' ? line.text.toLowerCase() : line.text
        const baseline = line.y + (line.height - ascent - descent) / 2 + ascent
        ctx.fillText(text, line.x, baseline)
        if (style.textDecorationLine.includes('underline')) {
          ctx.fillRect(line.x, baseline + parseFloat(style.fontSize) * 0.15, line.width, 1)
        }
      }
    }
    // Native list markers and the role separators aren't DOM text nodes.
    if (element.matches('li')) {
      const lineHeight = parseFloat(style.lineHeight) || ascent + descent
      const baseline = (lineHeight - ascent - descent) / 2 + ascent
      if (element.closest('.case-study__roles') && element.nextElementSibling) {
        ctx.fillText('•', w - ctx.measureText('•').width, baseline)
      } else if (style.listStyleType !== 'none') {
        const marker = element.parentElement?.tagName === 'OL' ? `${Array.from(element.parentElement.children).indexOf(element) + 1}.` : '•'
        ctx.fillText(marker, -ctx.measureText(marker + ' ').width, baseline)
      }
    }
  }

  private textLines(node: Text, element: HTMLElement, rect: DOMRect, sx: number, sy: number, style: CSSStyleDeclaration) {
    const key = [node.textContent, element.clientWidth, element.clientHeight, style.font, style.letterSpacing, document.fonts.status].join('|')
    const cached = this.lines.get(node)
    if (cached?.key === key) return cached.lines
    const range = document.createRange()
    const lines: Line[] = []
    // Read browser line breaks rather than approximating wrapping with canvas text metrics.
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1)
      const r = range.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const x = (r.x - rect.x) / sx, y = (r.y - rect.y) / sy
      const last = lines.at(-1)
      if (last && Math.abs(last.y - y) < 1) {
        last.text += node.data[i]
        last.width = (r.right - rect.x) / sx - last.x
      } else lines.push({ text: node.data[i], x, y, width: r.width / sx, height: r.height / sy })
    }
    this.lines.set(node, { key, lines })
    return lines
  }
}
