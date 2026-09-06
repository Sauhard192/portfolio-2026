import { GalleryPage } from '../components/gallery/GalleryPage'
import { photographs } from '../content/photographs'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function PhotographyPage() {
  useDocumentTitle('Photography — Sauhard Shrestha')
  return <GalleryPage collection="photography" items={photographs} />
}
