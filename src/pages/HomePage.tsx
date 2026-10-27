import { useMemo, useRef, useState } from 'react'

import { CustomCursor } from '../components/home/CustomCursor'
import { InfiniteProjectGallery } from '../components/home/InfiniteProjectGallery'
import { ProjectTypeFilter } from '../components/home/ProjectTypeFilter'
import { SiteHeader } from '../components/layout/SiteHeader'
import { homeProjects, projectTypeOptions } from '../content/homeProjects'
import { usePageEntrance } from '../hooks/usePageEntrance'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { HomeView } from '../types/home'

export function HomePage() {
  const pageRef = useRef<HTMLElement>(null)
  const [view, setView] = useState<HomeView>('grid')
  const [projectType, setProjectType] = useState('')
  const { matchingProjects, disabledSlugs } = useMemo(() => ({
    matchingProjects: projectType
      ? homeProjects.filter(project => project.projectType === projectType) : homeProjects,
    disabledSlugs: new Set(homeProjects
      .filter(project => projectType && project.projectType !== projectType).map(project => project.slug)),
  }), [projectType])
  usePageEntrance(pageRef, view)
  useDocumentTitle('Portfolio — Sauhard Shrestha')

  return (
    <main ref={pageRef} className="home-page home-page--filtered portfolio-background">
      <SiteHeader
        view={view}
        onViewChange={(nextView) => setView(nextView as HomeView)}
      />
      <InfiniteProjectGallery
        projects={view === 'list' ? matchingProjects : homeProjects}
        view={view}
        disabledSlugs={disabledSlugs}
        repeatList={!projectType}
      />
      <ProjectTypeFilter options={projectTypeOptions} value={projectType} onChange={setProjectType} />
      <CustomCursor />
    </main>
  )
}
