import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CaseStudyLensSource } from './caseStudyLensSource'
import { gridLensSourcePoint, gridLensStrength } from './gridLens'

// Distances in CSS pixels. Keep the bend inside the captured strip.
const PADDING = 32
const BEND = 30
const FRINGE = 2
const BLUR = 2
const vertexShader = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const fragmentShader = `
  uniform sampler2D uSource;
  uniform vec2 uScreen;
  uniform float uEdge;
  uniform float uBand;
  uniform float uBend;
  uniform float uFringe;
  uniform float uBlur;
  uniform float uCurve;
  uniform float uGrid;
  uniform float uPadding;
  uniform vec3 uBackground;
  varying vec2 vUv;
  vec3 sampleBand(vec2 p, float bottom) {
    if (uGrid > 0.0) {
      vec2 n = p / uScreen * 2.0 - 1.0;
      p = (n * (1.0 + uCurve * dot(n, n)) + 1.0) * 0.5 * uScreen;
      if (p.x < 0.0 || p.x > uScreen.x) return uBackground;
      return texture2D(uSource, vec2(clamp(p.x / uScreen.x, 0.0, 1.0),
        1.0 - clamp((p.y + uPadding) / (2.0 * uBand), 0.0, 1.0))).rgb;
    }
    p.x = clamp(p.x, 0.5, uScreen.x - 0.5);
    p.y = clamp(p.y, 0.5, uBand - 0.5);
    return texture2D(uSource, vec2(p.x / uScreen.x,
      1.0 - (p.y + bottom * uBand) / (2.0 * uBand))).rgb;
  }
  void main() {
    vec2 pixel = vec2(vUv.x, 1.0 - vUv.y) * uScreen;
    float bottom = step(uScreen.y * 0.5, pixel.y);
    float distanceToEdge = min(pixel.y, uScreen.y - pixel.y);
    if (distanceToEdge >= uEdge && uGrid == 0.0) discard;
    float strength = 1.0 - smoothstep(0.0, uEdge, distanceToEdge);
    float direction = mix(1.0, -1.0, bottom);
    vec2 p = uGrid > 0.0 ? pixel : vec2(pixel.x, pixel.y - bottom * (uScreen.y - uBand));
    if (uGrid > 0.0 && distanceToEdge >= uEdge) {
      gl_FragColor = vec4(sampleBand(p, bottom), 1.0);
      #include <colorspace_fragment>
      return;
    }

    p.y += direction * uBend * pow(strength, 4.0);

    // horizontal warp
    p.x += (pixel.x / uScreen.x - 0.5) * 5.0 * strength;

    strength = pow(strength, 2.6);

    vec2 fringe = vec2(uFringe * strength, direction * uFringe * strength);
    vec2 blur = vec2(uBlur * strength, 0.0);
    
    vec3 center = sampleBand(p, bottom) * 0.40 +
    sampleBand(p + blur * 0.5, bottom) * 0.20 +
    sampleBand(p - blur * 0.5, bottom) * 0.20 +
    sampleBand(p + blur, bottom) * 0.10 +
    sampleBand(p - blur, bottom) * 0.10;

    vec3 split = vec3(sampleBand(p + fringe, bottom).r, center.g, sampleBand(p - fringe, bottom).b);
    gl_FragColor = vec4(mix(center, split, 0.65), uGrid > 0.0 ? 1.0 : smoothstep(0.0, 0.15, strength));
    #include <colorspace_fragment>
  }
`

type Props = { galleryRef: RefObject<HTMLElement | null>; source?: 'gallery' | 'case-study'; grid?: boolean }

export default function GalleryEdgeLensCanvas({ galleryRef, source, grid = false }: Props) {
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const hitRef = useRef<HTMLAnchorElement>(null)
  const hovered = useRef<HTMLElement | null>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const resolveHit = (x: number, y: number) => {
    pointer.current = { x, y }
    const point = gridLensSourcePoint(x, y, innerWidth, innerHeight)
    const cards = galleryRef.current?.querySelectorAll<HTMLElement>('.project-card') ?? []
    const card = Array.from(cards).find(item => {
      const r = item.getBoundingClientRect()
      return point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom
    }) ?? null
    const changed = hovered.current !== card
    if (changed) {
      hovered.current?.removeAttribute('data-lens-hover')
      card?.setAttribute('data-lens-hover', 'true')
      hovered.current = card
    }
    const hit = hitRef.current
    const link = card?.querySelector<HTMLAnchorElement>('.project-card__link')
    if (hit) {
      if (link) hit.href = link.href
      else hit.removeAttribute('href')
      hit.dataset.cursor = card ? 'project' : 'dot'
      hit.dataset.tooltip = card?.dataset.tooltip ?? ''
      hit.dataset.year = card?.dataset.year ?? ''
      if (changed) hit.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    }
    return card
  }
  useEffect(() => () => { hovered.current?.removeAttribute('data-lens-hover') }, [])
  useEffect(() => {
    if (!grid || !ready || failed) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (pointer.current) resolveHit(pointer.current.x, pointer.current.y)
      })
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => { window.removeEventListener('scroll', update); cancelAnimationFrame(frame) }
  }, [grid, ready, failed])
  useEffect(() => {
    const gallery = galleryRef.current
    if (!gallery || !grid || !ready || failed) return
    gallery.dataset.gridLens = 'true'
    return () => { delete gallery.dataset.gridLens }
  }, [galleryRef, grid, ready, failed])
  if (failed) return null
  return <div className="gallery-edge-lens" aria-hidden="true" data-ready={ready}>
    <Canvas dpr={[1, 1.5]} gl={{ alpha: true, antialias: false }} fallback={<span />} onCreated={({ gl }) => {
      gl.domElement.addEventListener('webglcontextlost', () => setFailed(true), { once: true })
    }}>
      <LensScene galleryRef={galleryRef} source={source} grid={grid} onReady={() => setReady(true)} onFailure={() => setFailed(true)} />
    </Canvas>
    {grid && ready && <a ref={hitRef} className="grid-lens-hit" tabIndex={-1}
      onPointerMove={event => resolveHit(event.clientX, event.clientY)}
      onPointerDown={event => resolveHit(event.clientX, event.clientY)}
      onPointerLeave={() => { pointer.current = null; hovered.current?.removeAttribute('data-lens-hover'); hovered.current = null }}
      onClick={event => {
        const card = resolveHit(event.clientX, event.clientY)
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        const retry = card?.querySelector<HTMLButtonElement>('.image-error button')
        if (retry) retry.click()
        else card?.querySelector<HTMLAnchorElement>('.project-card__link')?.click()
      }} />}
  </div>
}

function LensScene({ galleryRef, source, grid = false, onReady, onFailure }: Props & { onReady: () => void; onFailure: () => void }) {
  const { size } = useThree()

  const edge = size.width <= 600 ? 100 : size.width <= 1024 ? 80 : 100

  // Extra rows above/below the viewport supply the curved screen edges.
  const padding = grid ? Math.ceil(size.height * 0.25) : 0
  const band = grid ? size.height / 2 + padding : edge + PADDING
  const dpr = Math.min(devicePixelRatio, 1.5)
  const resources = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(size.width * dpr)
    canvas.height = Math.ceil(band * 2 * dpr)
    const context = canvas.getContext('2d')!
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    return { canvas, context, texture }
  }, [size.width, band, dpr])
  const uniforms = useMemo(() => ({
    uSource: { value: resources.texture }, uScreen: { value: new THREE.Vector2(size.width, size.height) },
    uEdge: { value: edge }, uBand: { value: band }, uBend: { value: BEND },
    uFringe: { value: FRINGE }, uBlur: { value: BLUR },
    uCurve: { value: grid ? gridLensStrength(size.width) : 0 }, uGrid: { value: grid ? 1 : 0 }, uPadding: { value: padding },
    uBackground: { value: new THREE.Color() },
  }), [resources, size.width, size.height, edge, band, grid, padding])
  const targets = useRef<HTMLElement[]>([])
  const textLayouts = useRef(new WeakMap<HTMLElement, { key: string; lines: string[] }>())
  const lastSignature = useRef('')
  const announced = useRef(false)
  const caseSource = useRef<CaseStudyLensSource | null>(null)
  useEffect(() => {
    const gallery = galleryRef.current
    if (!gallery) return
    const collect = () => {
      if (source === 'case-study') caseSource.current = new CaseStudyLensSource(gallery)
      targets.current = Array.from(gallery.querySelectorAll<HTMLElement>(grid
        ? '.project-card .image-skeleton, .project-card img, .project-card__touch-meta > span, .project-card .image-error > span, .project-card .image-error button'
        : '.project-card img, .project-list-item .scramble-text__visual, .project-list-preview img'))
      lastSignature.current = ''
    }
    collect()
    const observer = new MutationObserver(collect)
    observer.observe(gallery, { childList: true, subtree: true })
    return () => { observer.disconnect(); resources.texture.dispose() }
  }, [galleryRef, resources, source, grid])

  useFrame(() => {
    if (document.hidden || !galleryRef.current) return
    if (source === 'case-study') {
      try {
        if (caseSource.current?.paint(resources.context, size.width, size.height, band, dpr)) {
          resources.texture.needsUpdate = true
          if (!announced.current) { announced.current = true; onReady() }
        }
      } catch { onFailure() }
      return
    }
    if (galleryRef.current.dataset.entranceReady !== 'true') return
    const gallery = galleryRef.current
    const page = gallery.closest('.portfolio-background')!
    const pageStyle = getComputedStyle(page)
    uniforms.uBackground.value.set(pageStyle.backgroundColor)
    const records = targets.current.flatMap(element => {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height || rect.bottom < -padding || rect.top > size.height + padding
        || (!grid && rect.top > band && rect.bottom < size.height - band)) return []
      const style = getComputedStyle(element)
      let opacity = Number(style.opacity)
      let parent = element.parentElement
      while (parent && parent !== page) {
        opacity *= Number(getComputedStyle(parent).opacity)
        parent = parent.parentElement
      }
      return [{ element, rect, style, opacity }]
    })
    const loading = grid && records.some(({ element, opacity }) => element.classList.contains('image-skeleton') && opacity > 0)
    const signature = `${loading ? Math.floor(performance.now() / 32) : ''},${size.width},${size.height},${pageStyle.backgroundColor}|` + records.map(({ element, rect, style, opacity }) =>
      `${rect.x.toFixed(2)},${rect.y.toFixed(2)},${rect.width.toFixed(2)},${rect.height.toFixed(2)},${opacity.toFixed(3)},${style.color},${element instanceof HTMLImageElement ? element.currentSrc + element.complete : element.textContent}`,
    ).join('|')
    if (signature === lastSignature.current) return
    lastSignature.current = signature
    const { context: ctx, texture } = resources
    try {
      // Paint the grid in one pass: fractional strip clips leave an antialiased seam.
      const captureHeight = grid ? band * 2 : band
      for (let bottom = 0; bottom < (grid ? 1 : 2); bottom++) {
        const origin = grid ? -padding : bottom ? size.height - band : 0
        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, bottom * band * dpr)
        ctx.beginPath(); ctx.rect(0, 0, size.width, captureHeight); ctx.clip()
        ctx.fillStyle = pageStyle.backgroundColor
        ctx.fillRect(0, 0, size.width, captureHeight)
        // Match the portfolio's existing vertical background guides.
        if (pageStyle.backgroundImage !== 'none') {
          const step = size.width / (size.width <= 640 ? 8 : 24)
          ctx.fillStyle = pageStyle.getPropertyValue('--color-grid-line')
          for (let x = step - 1; x < size.width; x += step) ctx.fillRect(x, 0, 1, captureHeight)
        }
        for (const { element, rect, style, opacity } of records) {
          if (rect.bottom < origin || rect.top > origin + captureHeight || opacity <= 0) continue
          ctx.save()
          ctx.globalAlpha = opacity
          ctx.translate(rect.x, rect.y - origin)
          if (element.classList.contains('image-skeleton')) {
            ctx.fillStyle = style.backgroundColor
            ctx.fillRect(0, 0, rect.width, rect.height)
            const sweep = (performance.now() % 1600) / 1600 * rect.width * 3 - rect.width
            const gradient = ctx.createLinearGradient(sweep - rect.width / 2, 0, sweep + rect.width / 2, 0)
            gradient.addColorStop(0, style.backgroundColor)
            gradient.addColorStop(0.5, pageStyle.getPropertyValue('--image-skeleton-highlight').trim())
            gradient.addColorStop(1, style.backgroundColor)
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, rect.width, rect.height)
          } else if (element instanceof HTMLImageElement) {
            if (element.complete && element.naturalWidth) {
              const scale = Math.max(rect.width / element.naturalWidth, rect.height / element.naturalHeight)
              const w = element.naturalWidth * scale, h = element.naturalHeight * scale
              ctx.beginPath(); ctx.rect(0, 0, rect.width, rect.height); ctx.clip()
              ctx.drawImage(element, (rect.width - w) / 2, (rect.height - h) / 2, w, h)
            }
          } else {
            const textWidth = parseFloat(style.width) || element.offsetWidth
            const scale = rect.width / Math.max(1, textWidth)
            ctx.scale(scale, scale)
            ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
            ctx.fillStyle = style.color
            ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
            const metrics = ctx.measureText(element.textContent ?? '')
            const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
            const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.8
            const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.2
            const baseline = (lineHeight - ascent - descent) / 2 + ascent
            if (grid) {
              // Read real browser line breaks; cache until text or layout changes.
              const key = [element.textContent, textWidth, style.height, ctx.font,
                style.letterSpacing, style.whiteSpace, document.fonts.status].join('|')
              let layout = textLayouts.current.get(element)
              if (layout?.key !== key) {
                const lines: string[] = []
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
                const range = document.createRange()
                let lineTop: number | undefined
                let node: Node | null
                while ((node = walker.nextNode())) {
                  const text = node.textContent ?? ''
                  for (let index = 0; index < text.length; index++) {
                    range.setStart(node, index)
                    range.setEnd(node, index + 1)
                    const bounds = range.getBoundingClientRect()
                    if (!bounds.height) continue
                    if (lineTop === undefined || Math.abs(bounds.top - lineTop) > 1 * scale) {
                      lines.push('')
                      lineTop = bounds.top
                    }
                    lines[lines.length - 1] += text[index]
                  }
                }
                layout = { key, lines: lines.map(line => line.trim()) }
                textLayouts.current.set(element, layout)
              }
              ctx.textAlign = style.textAlign === 'right' ? 'right' : 'left'
              layout.lines.forEach((text, index) => ctx.fillText(text,
                ctx.textAlign === 'right' ? textWidth : 0, baseline + index * lineHeight))
            } else ctx.fillText(element.textContent ?? '', 0, baseline)
          }
          ctx.restore()
        }
        ctx.restore()
      }
      texture.needsUpdate = true
      if (!announced.current) { announced.current = true; onReady() }
    } catch { onFailure() }
  })
  return <mesh frustumCulled={false}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
      transparent depthWrite={false} depthTest={false} />
  </mesh>
}
