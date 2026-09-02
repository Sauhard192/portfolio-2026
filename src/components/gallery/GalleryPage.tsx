import type { MediaCollection } from '../../types/media'

interface GalleryPageProps {
  collection: MediaCollection
  title: string
}

export function GalleryPage({ collection, title }: GalleryPageProps) {
  return (
    <main className="page" data-collection={collection}>
      <h1>{title}</h1>
    </main>
  )
}
