export type HomeView = 'grid' | 'list'
export type MediaGalleryView = 'spiral' | 'grid'

export interface InfiniteGalleryItem {
  slug: string
  title: string
  year: string
  href: string
  gridTooltip: string
  listTooltip: string
  cover: { src: string; srcSet?: string; alt: string }
}

export interface GalleryPositionMemory { gridPosition: number }

export interface ProjectTypeOption { value: string; label: string; count: number }
