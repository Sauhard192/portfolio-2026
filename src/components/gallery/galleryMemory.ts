import type { MediaCollection } from '../../types/media'
import type { MediaGalleryView } from '../../types/home'

// In-session memory survives viewer navigation without persisting across visits.
export const galleryMemory: Record<MediaCollection, { view?: MediaGalleryView; gridPosition: number; spiralPosition: number }> = {
  art: { gridPosition: 0, spiralPosition: 0 },
  photography: { gridPosition: 0, spiralPosition: 0 },
}
