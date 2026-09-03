const CINEMATIC_ROUTES = new Set(['/', '/art', '/photography', '/contact'])
const mediaCollection = (path: string) => /^\/(art|photography)\/[^/]+\/?$/.exec(path)?.[1]

export function shouldAnimateRouteChange(from: string, to: string) {
  if (from === to) return false
  const fromCollection = mediaCollection(from)
  const toCollection = mediaCollection(to)
  // Moving through one collection fades content only, not the whole page.
  if (fromCollection && fromCollection === toCollection) return false
  return Boolean((CINEMATIC_ROUTES.has(from) || fromCollection) && (CINEMATIC_ROUTES.has(to) || toCollection))
}
