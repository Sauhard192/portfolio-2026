import { Navigate, Route } from 'react-router-dom'

import { AppLayout } from './components/layout/AppLayout'
import { RouteTransition } from './components/layout/RouteTransition'
import { StartupLoader } from './components/layout/StartupLoader'
import { ArtPage } from './pages/ArtPage'
import { CaseStudyPage } from './pages/CaseStudyPage'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { MediaViewPage } from './pages/MediaViewPage'
import { PhotographyPage } from './pages/PhotographyPage'

export function App() {
  return (
    <>
      <RouteTransition>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="case-studies/:slug" element={<CaseStudyPage />} />
          <Route path="art" element={<ArtPage />} />
          <Route path="art/:slug" element={<MediaViewPage collection="art" />} />
          <Route path="photography" element={<PhotographyPage />} />
          <Route
            path="photography/:slug"
            element={<MediaViewPage collection="photography" />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </RouteTransition>
      <StartupLoader />
    </>
  )
}
