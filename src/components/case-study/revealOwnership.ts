const INITIAL_VIEWPORT_BUFFER = 64
export const CASE_CONTENT_READY_EVENT = 'portfolio:case-content-ready'

// The entrance timeline owns case-study images already visible on page load.
export function isInitialCaseStudyImage(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return bounds.bottom > -INITIAL_VIEWPORT_BUFFER
    && bounds.top < window.innerHeight + INITIAL_VIEWPORT_BUFFER
}
