import { Component, Suspense, lazy, useEffect, useState, type ReactNode, type RefObject } from 'react'

const EdgeLensCanvas = lazy(() => import('./GalleryEdgeLensCanvas'))

class LensFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

export function GalleryEdgeLens({ galleryRef, source = 'gallery' }: {
  galleryRef: RefObject<HTMLElement | null>; source?: 'gallery' | 'case-study'
}) {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(!preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return enabled ? <LensFallback><Suspense fallback={null}>
    <EdgeLensCanvas galleryRef={galleryRef} source={source} />
  </Suspense></LensFallback> : null
}
