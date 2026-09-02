import { useParams } from 'react-router-dom'

import type { MediaCollection } from '../types/media'

interface MediaViewPageProps {
  collection: MediaCollection
}

export function MediaViewPage({ collection }: MediaViewPageProps) {
  const { slug } = useParams()

  return <main className="page" data-collection={collection} data-media={slug} />
}
