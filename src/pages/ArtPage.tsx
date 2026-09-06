import { GalleryPage } from '../components/gallery/GalleryPage'
import { artworks } from '../content/artworks'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function ArtPage() {
  useDocumentTitle('Art — Sauhard Shrestha')
  return <GalleryPage collection="art" items={artworks} />
}
