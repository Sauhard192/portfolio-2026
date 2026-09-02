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
      <SiteHeader view={view} onViewChange={setView} />
      <InfiniteProjectGallery projects={caseStudies} view={view} />
      <CustomCursor />
    </main>
  )
}
