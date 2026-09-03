import type { MediaItem } from '../types/media'
import projectPlaceholder from '../assets/projects/project-placeholder.jpeg'

const photographDetails = [
  ['Passing Light', 'July 19, 2021'],
  ['Corner Study', 'September 5, 2021'],
  ['Late Afternoon', 'December 12, 2021'],
  ['Blue Hour', 'February 26, 2022'],
  ['On the Way', 'May 9, 2022'],
  ['A Small Distance', 'August 31, 2022'],
  ['Still Street', 'January 17, 2023'],
  ['Cloud Break', 'April 23, 2023'],
  ['The Long Route', 'July 8, 2023'],
  ['Before Rain', 'October 29, 2023'],
  ['Open Window', 'March 15, 2024'],
  ['Last Frame', 'November 21, 2024'],
] as const

const toSlug = (title: string) => title.toLowerCase().replace(/\s+/g, '-')

export const photographs: MediaItem[] = photographDetails.map(([title, date]) => ({
  slug: toSlug(title),
  title,
  caption: `A photograph titled ${title}.`,
  date,
  image: {
    src: projectPlaceholder,
    alt: `Placeholder for ${title}`,
    width: 330,
    height: 495,
  },
}))
