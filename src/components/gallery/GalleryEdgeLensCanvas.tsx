import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CaseStudyLensSource } from './caseStudyLensSource'

// Distances in CSS pixels. Keep the bend inside the captured strip.
const PADDING = 32
const BEND = 20
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
  varying vec2 vUv;
  vec3 sampleBand(vec2 p, float bottom) {
    p.x = clamp(p.x, 0.5, uScreen.x - 0.5);
    p.y = clamp(p.y, 0.5, uBand - 0.5);
    return texture2D(uSource, vec2(p.x / uScreen.x,
      1.0 - (p.y + bottom * uBand) / (2.0 * uBand))).rgb;
  }
  void main() {
    vec2 pixel = vec2(vUv.x, 1.0 - vUv.y) * uScreen;
    float bottom = step(uScreen.y * 0.5, pixel.y);
    float distanceToEdge = min(pixel.y, uScreen.y - pixel.y);
    if (distanceToEdge >= uEdge) discard;
    float strength = 1.0 - smoothstep(0.0, uEdge, distanceToEdge);
    float direction = mix(1.0, -1.0, bottom);
    vec2 p = vec2(pixel.x, pixel.y - bottom * (uScreen.y - uBand));

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
    gl_FragColor = vec4(mix(center, split, 0.65), smoothstep(0.0, 0.15, strength));
    #include <colorspace_fragment>
  }
`

type Props = { galleryRef: RefObject<HTMLElement | null>; source?: 'gallery' | 'case-study' }

export default function GalleryEdgeLensCanvas({ galleryRef, source }: Props) {
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  if (failed) return null
  return <div className="gallery-edge-lens" aria-hidden="true" data-ready={ready}>
    <Canvas dpr={[1, 1.5]} gl={{ alpha: true, antialias: false }} fallback={<span />} onCreated={({ gl }) => {
      gl.domElement.addEventListener('webglcontextlost', () => setFailed(true), { once: true })
    }}>
      <LensScene galleryRef={galleryRef} source={source} onReady={() => setReady(true)} onFailure={() => setFailed(true)} />
    </Canvas>
  </div>
}

function LensScene({ galleryRef, source, onReady, onFailure }: Props & { onReady: () => void; onFailure: () => void }) {
  const { size } = useThree()
  const edge = size.width <= 600 ? 100 : size.width <= 1024 ? 80 : 80
  const band = edge + PADDING
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
  }), [resources, size.width, size.height, edge, band])
  const targets = useRef<HTMLElement[]>([])
  const lastSignature = useRef('')
  const announced = useRef(false)
  const caseSource = useRef<CaseStudyLensSource | null>(null)
  useEffect(() => {
    const gallery = galleryRef.current
    if (!gallery) return
    const collect = () => {
      if (source === 'case-study') caseSource.current = new CaseStudyLensSource(gallery)
      targets.current = Array.from(gallery.querySelectorAll<HTMLElement>('.project-card img, .project-list-item, .project-list-preview img'))
      lastSignature.current = ''
    }
    collect()
    const observer = new MutationObserver(collect)
    observer.observe(gallery, { childList: true, subtree: true })
    return () => { observer.disconnect(); resources.texture.dispose() }
  }, [galleryRef, resources, source])

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
    const records = targets.current.flatMap(element => {
      const rect = element.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > size.height || (rect.top > band && rect.bottom < size.height - band)) return []
      const style = getComputedStyle(element)
      let opacity = Number(style.opacity)
      let parent = element.parentElement
      while (parent && parent !== page) {
        opacity *= Number(getComputedStyle(parent).opacity)
        parent = parent.parentElement
      }
      return [{ element, rect, style, opacity }]
    })
    const signature = `${size.width},${size.height},${pageStyle.backgroundColor}|` + records.map(({ element, rect, style, opacity }) =>
      `${rect.x.toFixed(2)},${rect.y.toFixed(2)},${rect.width.toFixed(2)},${rect.height.toFixed(2)},${opacity.toFixed(3)},${style.color},${element instanceof HTMLImageElement ? element.currentSrc + element.complete : element.textContent}`,
    ).join('|')
    if (signature === lastSignature.current) return
    lastSignature.current = signature
    const { context: ctx, texture } = resources
    try {
      for (let bottom = 0; bottom < 2; bottom++) {
        const origin = bottom ? size.height - band : 0
        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, bottom * band * dpr)
        ctx.beginPath(); ctx.rect(0, 0, size.width, band); ctx.clip()
        ctx.fillStyle = pageStyle.backgroundColor
        ctx.fillRect(0, 0, size.width, band)
        // Match the portfolio's existing vertical background guides.
        if (pageStyle.backgroundImage !== 'none') {
          const step = size.width / (size.width <= 640 ? 8 : 24)
          ctx.fillStyle = pageStyle.getPropertyValue('--color-grid-line')
          for (let x = step - 1; x < size.width; x += step) ctx.fillRect(x, 0, 1, band)
        }
        for (const { element, rect, style, opacity } of records) {
          if (rect.bottom < origin || rect.top > origin + band || opacity <= 0) continue
          ctx.save()
          ctx.globalAlpha = opacity
          ctx.translate(rect.x, rect.y - origin)
          if (element instanceof HTMLImageElement) {
            if (element.complete && element.naturalWidth) {
              const scale = Math.max(rect.width / element.naturalWidth, rect.height / element.naturalHeight)
              const w = element.naturalWidth * scale, h = element.naturalHeight * scale
              ctx.beginPath(); ctx.rect(0, 0, rect.width, rect.height); ctx.clip()
              ctx.drawImage(element, (rect.width - w) / 2, (rect.height - h) / 2, w, h)
            }
          } else {
            const scale = rect.width / Math.max(1, element.offsetWidth)
            ctx.scale(scale, scale)
            ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
            ctx.fillStyle = style.color
            ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
            const metrics = ctx.measureText(element.textContent ?? '')
            const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
            const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.8
            const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.2
            ctx.fillText(element.textContent ?? '', 0, (lineHeight - ascent - descent) / 2 + ascent)
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
