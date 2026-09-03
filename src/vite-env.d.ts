/// <reference types="vite/client" />

declare module 'virtual:portfolio-media/art' {
  const items: import('./types/media').MediaItem[]
  export default items
}

declare module 'virtual:portfolio-media/photography' {
  const items: import('./types/media').MediaItem[]
  export default items
}
