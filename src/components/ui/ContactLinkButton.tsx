import arrowTopLeft from '../../assets/icons/arrow-top-left.svg'
import { ScrambleText } from './ScrambleText'

interface ContactLinkButtonProps {
  children: string
  href: string
  newTab?: boolean
}

export function ContactLinkButton({ children, href, newTab = false }: ContactLinkButtonProps) {
  return (
    <a
      className="contact-link-button"
      href={href}
      data-cursor="interactive"
      data-enter-meta
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noreferrer' : undefined}
    >
      <ScrambleText>{children}</ScrambleText>
      <img className="contact-link-button__icon" src={arrowTopLeft} alt="" aria-hidden="true" />
    </a>
  )
}
