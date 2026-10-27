import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import closeIcon from '../../assets/icons/close.svg'
import type { ProjectTypeOption } from '../../types/home'

export function ProjectTypeFilter({ options, value, onChange }: {
  options: ProjectTypeOption[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const selected = options.find(option => option.value === value) ?? options[0]

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const focusOutside = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', focusOutside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', focusOutside)
    }
  }, [open])

  const navigateOptions = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); return }
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let next: number
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length
    else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = buttons.length - 1
    else return
    event.preventDefault()
    buttons[next]?.focus({ preventScroll: true })
  }

  return <div ref={rootRef} className="project-filter" data-open={open}>
    <div data-page-header>
      <button ref={triggerRef} type="button" className="project-filter__trigger" data-cursor="interactive"
        aria-label={`Filter by project type: ${selected.label}, ${selected.count} projects`}
        aria-expanded={open} aria-haspopup="menu" aria-controls={id}
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={event => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) }
          if (event.key === 'Escape') close()
        }}>
        <span className="project-filter__text">
          <span className="project-filter__label">{selected.label}</span>
          <span className="project-filter__count">({selected.count})</span>
        </span>
      </button>
    </div>
    <div className="project-filter__panel" data-open={open} inert={!open} onKeyDown={navigateOptions}>
      <button type="button" className="project-filter__close" aria-label="Close project type filter"
        data-cursor="interactive" onClick={() => close(true)}>
        <img src={closeIcon} alt="" />
      </button>
      <div ref={menuRef} id={id} role="menu" aria-label="Project type" className="project-filter__options" data-lenis-prevent>
        {options.map(option => <button key={option.value} type="button" role="menuitemradio"
          aria-checked={value === option.value} data-cursor="interactive"
          className="project-filter__option" onClick={() => { onChange(option.value); close(true) }}>
          <span className="project-filter__text">
            <span className="project-filter__option-label">{option.label}</span>
            <span className="project-filter__count">({option.count})</span>
          </span>
        </button>)}
      </div>
    </div>
  </div>
}
