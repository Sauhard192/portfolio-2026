/// <reference types="vite/client" />

declare module 'virtual:portfolio-projects' {
  const projects: import('./types/caseStudy').CaseStudy[]
  export default projects
}

declare module '*?portfolio-image' {
  const image: import('./types/caseStudy').OptimizedProjectImage
  export default image
}

declare module 'virtual:portfolio-media/art' {
  const items: import('./types/media').MediaItem[]
  export default items
}

declare module 'virtual:portfolio-media/photography' {
  const items: import('./types/media').MediaItem[]
  export default items
}
