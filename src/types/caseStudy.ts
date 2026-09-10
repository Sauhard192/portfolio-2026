export interface OptimizedProjectImage {
  src: string
  srcSet: string
  width: number
  height: number
  thumbnail: { src: string; srcSet: string }
  animatedSrc?: string // Detail only; thumbnails always use a still frame.
}

export interface ProjectImage extends OptimizedProjectImage {
  alt: string
  position?: string // CSS object-position, e.g. '50% 30%'.
  caption?: string
}

export interface ProjectVideo {
  src: string
  width: number
  height: number
  alt: string
  poster?: ProjectImage
  caption?: string
}

export type TextRun = string | { text: string; href: string }
export type ProjectBody = string | Array<
  | { type: 'paragraph'; content: TextRun[] }
  | { type: 'list'; items: TextRun[][]; ordered?: boolean }
>

export type CaseStudySection =
  | { type: 'notes'; title: string; body: ProjectBody }
  | { type: 'images'; images: [ProjectImage] | [ProjectImage, ProjectImage] | [ProjectImage, ProjectImage, ProjectImage]; aspectRatio?: string }
  | { type: 'video'; video: ProjectVideo }

export interface CaseStudy {
  slug: string
  title: string
  roles: string[]
  projectType: string
  date: string // Displayed exactly as entered; no parsing or date sorting.
  description: ProjectBody
  labels?: { projectType?: string; date?: string; description?: string }
  siteUrl?: string
  hero: ProjectImage
  heroAspectRatio?: string
  thumbnail?: ProjectImage // Defaults to the hero's optimized thumbnail.
  sections: CaseStudySection[]
}

// Authoring contract for each project's info.json. Paths are relative to its folder.
export type ProjectImageFile = string | { file: string; alt?: string; position?: string; caption?: string }
export interface ProjectVideoFile {
  video: string
  poster?: ProjectImageFile
  alt?: string
  caption?: string
}
export type ProjectSectionInfo =
  | { title: string; body: ProjectBody }
  | { images: [ProjectImageFile] | [ProjectImageFile, ProjectImageFile] | [ProjectImageFile, ProjectImageFile, ProjectImageFile]; aspectRatio?: string }
  | ProjectVideoFile
export interface ProjectInfo extends Partial<Omit<CaseStudy, 'slug' | 'title' | 'hero' | 'thumbnail' | 'sections'>> {
  title: string
  slug?: string
  hero: ProjectImageFile
  thumbnail?: ProjectImageFile
  sections?: ProjectSectionInfo[]
}
