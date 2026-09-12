export const STARTUP_READY_EVENT = 'portfolio:startup-ready'

export const isStartupPending = () => (
  document.documentElement.dataset.startup === 'loading'
)
