const activeLocks = new Set<symbol>()
let previousOverflow = ''

export function acquireDocumentScrollLock(label: string) {
  const token = Symbol(label)

  if (activeLocks.size === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.dataset.pageScrollLocked = 'true'
  }

  activeLocks.add(token)
  let released = false

  return () => {
    if (released) return
    released = true
    activeLocks.delete(token)

    if (activeLocks.size > 0) return
    document.body.style.overflow = previousOverflow
    delete document.documentElement.dataset.pageScrollLocked
  }
}
