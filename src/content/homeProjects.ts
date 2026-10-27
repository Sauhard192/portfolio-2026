import { caseStudies } from './caseStudies'
import type { InfiniteGalleryItem, ProjectTypeOption } from '../types/home'

type HomeProject = InfiniteGalleryItem & { projectType: string }

export const homeProjects: HomeProject[] = caseStudies.map((project) => ({
  slug: project.slug,
  title: project.title,
  projectType: project.projectType?.trim() || 'Other',
  year: [project.projectType, project.date].filter(Boolean).join(' • '),
  href: `/case-studies/${project.slug}`,
  gridTooltip: project.title,
  listTooltip: project.title,
  cover: { ...(project.thumbnail ?? project.hero).thumbnail, alt: (project.thumbnail ?? project.hero).alt },
}))
const typeCounts = new Map<string, number>()
homeProjects.forEach(project => typeCounts.set(project.projectType, (typeCounts.get(project.projectType) ?? 0) + 1))
export const projectTypeOptions: ProjectTypeOption[] = [
  { value: '', label: 'All', count: homeProjects.length },
  ...Array.from(typeCounts, ([value, count]) => ({ value, label: value, count })),
]
