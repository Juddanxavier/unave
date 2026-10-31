import Image from 'next/image'
import React from 'react'

import { cn } from '@/utilities/ui'

/**
 * Section wrapper. Holds the vertical rhythm (96px desktop / 56px mobile) and the
 * alternating background bands from design.md §3.6, so no section invents its own.
 *
 * A section can also carry a full-bleed photograph behind its content. The photo is
 * decorative reinforcement, so it takes no alt text; whatever it shows is said in
 * words by the section itself.
 */
const TONES = {
  cream: 'bg-background text-foreground',
  white: 'bg-card text-foreground',
  tint: 'bg-green-50 text-foreground',
  highlight: 'bg-green-100 text-foreground',
  green: 'bg-green-700 text-cream',
} as const

export type SectionTone = keyof typeof TONES

interface Props {
  children: React.ReactNode
  className?: string
  id?: string
  tone?: SectionTone
  /** Full-bleed photograph behind the content. */
  image?: {
    src: string
    /** Set on the one image above the fold so it loads with the document. */
    priority?: boolean
  }
  /** Scrim laid over `image` so the text keeps its contrast. */
  overlay?: string
}

export const Section: React.FC<Props> = ({
  children,
  className,
  id,
  image,
  overlay = 'bg-green-900/80',
  tone = 'cream',
}) => (
  <section
    className={cn('py-14 md:py-24', TONES[tone], image && 'relative overflow-hidden', className)}
    id={id}
  >
    {image ? (
      <>
        <Image
          alt=""
          className="object-cover"
          fill
          priority={image.priority}
          quality={75}
          sizes="100vw"
          src={image.src}
        />
        <div aria-hidden="true" className={cn('absolute inset-0', overlay)} />
      </>
    ) : null}

    <div className="container relative">{children}</div>
  </section>
)
