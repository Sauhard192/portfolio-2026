export type MediaCollection = 'art' | 'photography'

export interface MediaItem {
  slug: string
  title: string
  image: {
    src: string
    alt: string
    width: number
    height: number
    thumbnail: { src: string; srcSet: string }
    spiralSrc: string
  }
  caption: string
  date: string // Formatted display text, generated from info.json's date.
  dateISO: string // YYYY-MM-DD or YYYY; shared sorting source.
  location?: string
}
