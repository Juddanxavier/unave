import Image from 'next/image'
import React from 'react'

import { IMAGES, WELCOME_BODY, WELCOME_HEADING, WELCOME_PHOTO } from '@/utilities/homeCopy'

import { Section } from './Section'

export const Welcome: React.FC = () => (
  <Section>
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="text-h2">{WELCOME_HEADING}</h2>
        {WELCOME_BODY.map((paragraph) => (
          <p className="text-body text-ink-600 mt-4 max-w-[65ch]" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="ring-green-900/10 relative aspect-[5/4] overflow-hidden rounded-lg shadow-md ring-1">
        <Image
          alt={WELCOME_PHOTO}
          className="object-cover"
          fill
          quality={75}
          sizes="(min-width: 1024px) 560px, 100vw"
          src={IMAGES.kitchen}
        />
      </div>
    </div>
  </Section>
)
