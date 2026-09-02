import type { CaseStudy } from '../types/caseStudy'
import projectPlaceholder from '../assets/projects/project-placeholder.jpeg'

const projectDetails = [
  { title: 'Ludo Cards', projectType: 'Mobile game' },
  { title: 'Bhoos Fantasy', projectType: 'Fantasy sports app' },
  { title: 'Uptrendly App', projectType: 'Creator platform' },
  { title: 'GangWars - NFT Game', projectType: 'NFT game' },
  { title: 'MyUniport', projectType: 'Education platform' },
  { title: 'WWW.DIYO.AI', projectType: 'AI website' },
  { title: 'Equicom', projectType: 'Fintech product' },
  { title: 'DIYO AI', projectType: 'AI product' },
  { title: 'Jelli Studios', projectType: 'Studio website' },
  { title: 'Typography Exercises', projectType: 'Typography study' },
  { title: 'Calendar 2026', projectType: 'Editorial design' },
  { title: 'The Vertex', projectType: 'Brand experience' },
] as const

const toSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const caseStudies: CaseStudy[] = projectDetails.map(({ title, projectType }) => ({
  slug: toSlug(title),
  title,
  projectType,
  year: '2026',
  summary: 'Portfolio case study',
  cover: {
    src: projectPlaceholder,
    alt: `Placeholder cover for ${title}`,
  },
  sections: [],
}))
