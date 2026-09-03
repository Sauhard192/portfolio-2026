import type { MediaItem } from '../types/media'
import projectPlaceholder from '../assets/projects/project-placeholder.jpeg'

const artworkDetails = [
  ['Afterimage', 'July 19, 2021'],
  ['Quiet Current', 'August 7, 2021'],
  ['Blue Interval', 'October 22, 2021'],
  ['Soft Divide', 'January 14, 2022'],
  ['Night Studies', 'March 3, 2022'],
  ['Still Moving', 'June 28, 2022'],
  ['False Horizon', 'September 16, 2022'],
  ['Between Forms', 'February 11, 2023'],
  ['Small Weather', 'May 24, 2023'],
  ['Memory Field', 'November 9, 2023'],
  ['Open Shape', 'April 18, 2024'],
  ['Almost There', 'December 2, 2024'],
] as const

const toSlug = (title: string) => title.toLowerCase().replace(/\s+/g, '-')

export const artworks: MediaItem[] = artworkDetails.map(([title, date]) => ({
  slug: toSlug(title),
  title,
  caption: `A study titled ${title}.`,
  date,
  image: {
    src: projectPlaceholder,
    alt: `Placeholder for ${title}`,
    width: 330,
    height: 495,
  },
}))
