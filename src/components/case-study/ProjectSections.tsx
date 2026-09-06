import { Fragment, useEffect, useRef, useState } from 'react'
import type { CaseStudySection, ProjectBody, ProjectImage, TextRun } from '../../types/caseStudy'
import { ProgressiveImage } from '../ui/ProgressiveImage'

function InlineText({ runs }: { runs: TextRun[] }) {
  return runs.map((run, index) => typeof run === 'string'
    ? <Fragment key={index}>{run}</Fragment>
    : <a key={index} href={run.href} data-cursor="interactive">{run.text}</a>)
}

export function ProjectText({ body }: { body: ProjectBody }) {
  return <div className="case-study__prose">{typeof body === 'string'
    ? body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)
    : body.map((block, index) => {
      if (block.type === 'paragraph') return <p key={index}><InlineText runs={block.content} /></p>
      const List = block.ordered ? 'ol' : 'ul'
      return <List key={index}>{block.items.map((item, i) => <li key={i}><InlineText runs={item} /></li>)}</List>
    })}</div>
}

export function CaseImage({ image, priority = false, sizes = '100vw' }: {
  image: ProjectImage; priority?: boolean; sizes?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failedSource, setFailedSource] = useState<string>()
  useEffect(() => {
    const element = ref.current
    if (!element || !image.animatedSrc) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const update = () => setPlaying(visible && !reducedMotion.matches && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    })
    observer.observe(element)
    reducedMotion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      reducedMotion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [image.animatedSrc])
  // Native animated images have no pause API: use a still while inactive.
  const animated = playing && image.animatedSrc && failedSource !== image.animatedSrc
  return <ProgressiveImage containerRef={ref} src={animated ? image.animatedSrc : image.src} srcSet={animated ? undefined : image.srcSet} sizes={sizes}
    data-lens-animated={Boolean(animated)}
    width={image.width} height={image.height} alt={image.alt}
    loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"
    onFailure={animated ? () => setFailedSource(image.animatedSrc) : undefined}
    style={image.position ? { objectPosition: image.position } : undefined} />
}

export function ProjectSection({ section }: { section: CaseStudySection }) {
  if (section.type === 'notes') return <section className="case-study__notes" data-case-reveal>
    <h2>{section.title}</h2>
    <ProjectText body={section.body} />
  </section>

  const columns = section.images.length
  return <div className="case-study__images" data-columns={columns}>
    {section.images.map((image, index) => <figure className="case-study__image" key={index} data-case-reveal>
      <CaseImage image={image} sizes={`(max-width: 640px) calc(100vw - 2rem), ${Math.round(100 / columns)}vw`} />
    </figure>)}
  </div>
}
