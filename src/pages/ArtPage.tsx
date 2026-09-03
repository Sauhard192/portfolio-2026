import { GalleryPage } from '../components/gallery/GalleryPage'
import { artworks } from '../content/artworks'

export function ArtPage() {
  return <GalleryPage collection="art" items={artworks} />
}
