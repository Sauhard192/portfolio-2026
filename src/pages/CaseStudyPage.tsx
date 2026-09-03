import { useLayoutEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CustomCursor } from '../components/home/CustomCursor'
import { SiteHeader } from '../components/layout/SiteHeader'
import { ContactLinkButton } from '../components/ui/ContactLinkButton'
import { CaseImage, ProjectSection, ProjectText } from '../components/case-study/ProjectSections'
import { NextProjectFooter } from '../components/case-study/NextProjectFooter'
import { nextProjectIndex } from '../components/case-study/caseStudyNavigation'
import { caseStudies } from '../content/caseStudies'
import { usePageEntrance } from '../hooks/usePageEntrance'
import type { CaseStudy } from '../types/caseStudy'
import type { CSSProperties } from 'react'

export function CaseStudyPage() {
  const { slug } = useParams()
  const index = caseStudies.findIndex((project) => project.slug === slug)
  const project = caseStudies[index]
  const next = caseStudies[nextProjectIndex(index, caseStudies.length)]
  return <CaseStudyContent key={slug} project={project} next={next} />
}

function CaseStudyContent({ project, next }: { project?: CaseStudy; next?: CaseStudy }) {
  const pageRef = useRef<HTMLElement>(null)
  usePageEntrance(pageRef)
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${project?.title ?? 'Project not found'} — Jhelli`
    pageRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }, [project])

  return <main ref={pageRef} className="case-study-page portfolio-background" data-case-study={project?.slug}>
    <SiteHeader />
    {project ? <article className="case-study">
      <header className="case-study__intro">
        <h1 tabIndex={-1} data-enter-text>{project.title}</h1>
        <div className="case-study__intro-bottom">
          <ul className="case-study__roles" aria-label="Roles" data-enter-text>
            {project.roles.map((role, index) => <li key={index}>{role}</li>)}
          </ul>
          {project.siteUrl?.trim() && <ContactLinkButton href={project.siteUrl} newTab>VIEW SITE</ContactLinkButton>}
        </div>
      </header>
      <figure className="case-study__hero" data-enter-image
        style={project.heroAspectRatio ? { '--case-image-ratio': project.heroAspectRatio } as CSSProperties : undefined}>
        <CaseImage image={project.hero} priority />
      </figure>
      <div className="case-study__metadata" data-case-reveal>
        <dl>
          <div><dt>{project.labels?.projectType ?? 'PROJECT TYPE'}</dt><dd>{project.projectType}</dd></div>
          <div><dt>{project.labels?.date ?? 'YEAR'}</dt><dd>{project.date}</dd></div>
        </dl>
        <div className="case-study__description">
          <h2>{project.labels?.description ?? 'DESCRIPTION'}</h2>
          <ProjectText body={project.description} />
        </div>
      </div>
      <div className="case-study__sections">
        {project.sections.map((section, index) => <ProjectSection key={index} section={section} />)}
      </div>
    </article> : <section className="case-study case-study__missing">
      <h1 tabIndex={-1} data-enter-text>Project not found</h1>
      <Link to="/" data-cursor="interactive">Return to projects</Link>
    </section>}
    {next && <NextProjectFooter project={next} pageRef={pageRef} />}
    <CustomCursor />
  </main>
}
