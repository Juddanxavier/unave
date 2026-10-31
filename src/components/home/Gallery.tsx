import Image from 'next/image'
import React from 'react'

import { GALLERY, GALLERY_HEADING, GALLERY_INTRO } from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * A short photographic band, in the place a competitor fills with a menu grid.
 * Captions are on the photographs, so the pictures carry no alt text of their own.
 */
export const Gallery: React.FC = () => (
  <Section tone="white">
    <h2 className="text-h2">{GALLERY_HEADING}</h2>
    <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{GALLERY_INTRO}</p>

    <div className="mt-10 grid gap-6 sm:grid-cols-3">
      {GALLERY.map((item) => (
        <figure className="relative aspect-[4/5] overflow-hidden rounded-lg" key={item.image}>
          <Image
            alt=""
            className="object-cover"
            fill
            quality={75}
            sizes="(min-width: 40rem) 33vw, 100vw"
            src={item.image}
          />
          <div
            aria-hidden="true"
            className="from-green-900/85 via-green-900/25 absolute inset-0 bg-linear-to-t to-transparent"
          />
          <figcaption className="text-caption text-cream absolute inset-x-5 bottom-5">
            {item.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  </Section>
)
