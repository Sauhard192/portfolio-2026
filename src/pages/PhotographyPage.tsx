import { GalleryPage } from '../components/gallery/GalleryPage'
import { photographs } from '../content/photographs'

export function PhotographyPage() {
  return <GalleryPage collection="photography" items={photographs} />
}
