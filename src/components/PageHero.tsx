import React from 'react'

import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'

interface Props {
  /** Short uppercase label above the headline. */
  eyebrow: string
  /** The headline, up to the accent phrase. */
  headline: string
  /** The closing words of the headline, set in gold italic. */
  accent?: string
  /** One line under the headline. */
  sub: string
  /** Decorative band photograph, laid under a green-900 scrim. */
  image?: string
  /** Content under the lead line, such as a call to action. */
  children?: React.ReactNode
}

/**
 * The green band that opens a content page (design.md §10.1, §10.3): eyebrow, a
 * Playfair headline with a gold accent phrase, one lead line, on a photograph
 * under a green-900 scrim, with the logo swoosh faint behind it.
 *
 * About, Contact and Plans each carry their own copy of this band, because each
 * adds something of its own. This is the shared one, so a page added later does
 * not hand-roll the same block a fourth time.
 */
export const PageHero: React.FC<Props> = ({ accent, children, eyebrow, headline, image, sub }) => (
  <Section
    className="opening-band overflow-hidden bg-green-900 md:py-20"
    image={image ? { priority: true, src: image } : undefined}
    overlay="bg-green-900/85"
    tone="green"
  >
    <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

    <div className="relative max-w-[46rem]">
      <p className="text-eyebrow text-gold-400 uppercase">{eyebrow}</p>

      <h1 className="text-display mt-4 text-balance">
        {headline}
        {accent ? (
          <>
            {' '}
            <span className="text-gold-400 whitespace-nowrap italic">{accent}</span>
          </>
        ) : null}
      </h1>

      <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{sub}</p>

      {children}
    </div>
  </Section>
)
