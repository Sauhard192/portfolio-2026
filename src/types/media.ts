export type MediaCollection = 'art' | 'photography'

export interface MediaItem {
  slug: string
  title: string
  image: {
    src: string
    alt: string
    width: number
    height: number
  }
  caption: string
  date: string
}
