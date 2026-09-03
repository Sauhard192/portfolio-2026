import { useParams } from 'react-router-dom'

import type { MediaCollection } from '../types/media'
import { MediaViewer } from '../components/gallery/MediaViewer'
import { artworks } from '../content/artworks'
import { photographs } from '../content/photographs'

interface MediaViewPageProps {
  collection: MediaCollection
}

export function MediaViewPage({ collection }: MediaViewPageProps) {
  const { slug } = useParams()

  return <MediaViewer key={collection} collection={collection} items={collection === 'art' ? artworks : photographs} slug={slug} />
}
