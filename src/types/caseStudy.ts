export type CaseStudySection =
  | {
      type: 'text'
      heading?: string
      body: string
    }
  | {
      type: 'media'
      layout: 'full-width' | 'columns' | 'asymmetric'
      items: Array<{
        src: string
        alt: string
        kind: 'image' | 'video'
      }>
    }

export interface CaseStudy {
  slug: string
  title: string
  projectType: string
  year: string
  summary: string
  cover: {
    src: string
    alt: string
  }
  sections: CaseStudySection[]
}
