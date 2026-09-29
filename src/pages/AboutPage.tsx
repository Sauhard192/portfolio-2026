import { useRef } from 'react'
import { CustomCursor } from '../components/home/CustomCursor'
import { SiteHeader } from '../components/layout/SiteHeader'
import { ContactLinkButton } from '../components/ui/ContactLinkButton'
import { usePageEntrance } from '../hooks/usePageEntrance'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import '../styles/about.css'

export function AboutPage() {
  const pageRef = useRef<HTMLElement>(null)
  usePageEntrance(pageRef)
  useDocumentTitle('About — Sauhard Shrestha')

  return (
    <main ref={pageRef} className="about-page portfolio-background">
      <SiteHeader />
      <section className="about-intro" aria-labelledby="about-heading">
        <h1 id="about-heading" className="about-heading">
          <span data-enter-text>Hello there,</span>
          <strong data-enter-text>I’m Sauhard Shrestha.</strong>
        </h1>
        <div className="about-biography">
          <p data-enter-text>
            A Kathmandu-based UI/UX and visual designer with 5+ years of experience across
            digital products, games, branding, and visual communication. I enjoy turning
            complex ideas into clear, engaging experiences, with a particular interest in the
            space between interaction, visual systems, and storytelling.
          </p>
          <p data-enter-text>
            Outside of design, I spend a lot of time photographing, drawing, and experimenting
            with ways to bring those interests into digital experiences.
          </p>
        </div>
      </section>
      <dl className="about-details">
        <div>
          <dt data-enter-meta>Location</dt>
          <dd data-enter-meta>Kathmandu, Nepal</dd>
        </div>
        <div>
          <dt data-enter-meta>Role</dt>
          <dd data-enter-meta>Visual &amp; UI/UX Designer</dd>
        </div>
        <div>
          <dt data-enter-meta>Contact</dt>
          <dd>
            <ContactLinkButton href="mailto:sauhard192@gmail.com">sauhard192@gmail.com</ContactLinkButton>
            <ContactLinkButton href="https://www.linkedin.com/in/sauhard-shrestha-2072921b7/" newTab>LinkedIn</ContactLinkButton>
          </dd>
        </div>
        <div>
          <dt data-enter-meta>Experience</dt>
          <dd>
            <ContactLinkButton href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/sauhard-shrestha-cv.pdf`} newTab>CV / Resume</ContactLinkButton>
          </dd>
        </div>
      </dl>
      <CustomCursor />
    </main>
  )
}
