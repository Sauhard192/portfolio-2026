import { useRef, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CaseStudy } from '../../types/caseStudy'
import { useCaseStudyScroll } from '../../hooks/useCaseStudyScroll'
import { ProgressiveImage } from '../ui/ProgressiveImage'

export function NextProjectFooter({ project, pageRef }: {
  project: CaseStudy; pageRef: RefObject<HTMLElement | null>
}) {
  const footerRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const href = `/case-studies/${project.slug}`
  const thumbnail = project.thumbnail ?? project.hero
  useCaseStudyScroll(pageRef, footerRef, progressRef, () => navigate(href))

  return <footer ref={footerRef} className="next-project" aria-labelledby="next-project-heading">
    <div className="next-project-heading">UP NEXT</div>
    <div className="next-project__link" data-cursor="interactive">
      <Link className="next-project__hit-area" to={href} aria-label={`Next project: ${project.title}`} />
      <div className="next-project__preview">
        <span className="next-project__label next-project__label--scroll">Keep Scrolling!</span>
        <span className="next-project__label next-project__label--click">View Project</span>
        {/* Use the detail variant: square cropping can magnify a smaller srcset candidate. */}
        <ProgressiveImage className="next-project__image" src={thumbnail.src}
          width={thumbnail.width} height={thumbnail.height} alt="" loading="lazy" />
      </div>
      <span className="next-project__title">{project.title}</span>
    </div>
    <div ref={progressRef} className="next-project__progress" role="progressbar" aria-label="Scroll to next project"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
      <span />
    </div>
  </footer>
}
