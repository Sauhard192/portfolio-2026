import { useRef, useState } from 'react'

import { CustomCursor } from '../components/home/CustomCursor'
import { InfiniteProjectGallery } from '../components/home/InfiniteProjectGallery'
import { SiteHeader } from '../components/layout/SiteHeader'
import { caseStudies } from '../content/caseStudies'
import { usePageEntrance } from '../hooks/usePageEntrance'
import type { HomeView } from '../types/home'

export function HomePage() {
  const pageRef = useRef<HTMLElement>(null)
  const [view, setView] = useState<HomeView>('grid')
  usePageEntrance(pageRef)

  return (
    <main ref={pageRef} className="home-page portfolio-background">
      <SiteHeader
        view={view}
        onViewChange={(nextView) => setView(nextView as HomeView)}
      />
      <InfiniteProjectGallery
        projects={caseStudies.map((project) => ({
          slug: project.slug,
          title: project.title,
          year: project.date,
          href: `/case-studies/${project.slug}`,
          gridTooltip: project.title,
          listTooltip: project.projectType,
          cover: { ...(project.thumbnail ?? project.hero).thumbnail, alt: (project.thumbnail ?? project.hero).alt },
        }))}
        view={view}
      />
      <CustomCursor />
    </main>
  )
}
