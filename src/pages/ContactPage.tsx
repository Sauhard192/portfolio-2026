import { useRef } from 'react'

import { CustomCursor } from '../components/home/CustomCursor'
import { SiteHeader } from '../components/layout/SiteHeader'
import { ContactLinkButton } from '../components/ui/ContactLinkButton'
import { usePageEntrance } from '../hooks/usePageEntrance'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function ContactPage() {
  const pageRef = useRef<HTMLElement>(null)
  usePageEntrance(pageRef)
  useDocumentTitle('Contact — Sauhard Shrestha')

  return (
    <main ref={pageRef} className="contact-page portfolio-background">
      <SiteHeader />

      <section className="contact-content" aria-labelledby="contact-heading">
        <p className="contact-label" data-enter-text>
          CONTACT
        </p>
        <h1 id="contact-heading" data-enter-text>
          Get in touch
        </h1>

        <div className="contact-links" aria-label="Contact links">
          <ContactLinkButton href="mailto:sauhard192@gmail.com">
            sauhard192@gmail.com
          </ContactLinkButton>
          <ContactLinkButton href="https://www.linkedin.com/in/sauhard-shrestha-2072921b7/" newTab>
            LinkedIn
          </ContactLinkButton>
          <ContactLinkButton href={`${import.meta.env.BASE_URL}/sauhard-shrestha-cv.pdf`} newTab>
            CV/Resume
          </ContactLinkButton>
        </div>
      </section>

      <CustomCursor />
    </main>
  )
}
