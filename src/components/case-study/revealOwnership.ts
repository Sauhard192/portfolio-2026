export const CASE_CONTENT_READY_EVENT = 'portfolio:case-content-ready'

// The entrance timeline owns case-study elements already visible on page load.
export function isInitialCaseStudyElement(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return bounds.bottom > 0 && bounds.top < window.innerHeight
}
