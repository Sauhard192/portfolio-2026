const CINEMATIC_ROUTES = new Set(['/', '/art', '/photography', '/contact'])
const mediaCollection = (path: string) => /^\/(art|photography)\/[^/]+\/?$/.exec(path)?.[1]
const isCaseStudy = (path: string) => /^\/case-studies\/[^/]+\/?$/.test(path)

export function shouldAnimateRouteChange(from: string, to: string) {
  if (from === to) return false
  const fromCollection = mediaCollection(from)
  const toCollection = mediaCollection(to)
  // Only image-to-image navigation within a collection is instant.
  if (fromCollection && fromCollection === toCollection) return false
  return Boolean((CINEMATIC_ROUTES.has(from) || fromCollection || isCaseStudy(from)) &&
    (CINEMATIC_ROUTES.has(to) || toCollection || isCaseStudy(to)))
}
