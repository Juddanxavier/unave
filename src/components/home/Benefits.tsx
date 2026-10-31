import React from 'react'

import { BENEFITS, BENEFITS_HEADING } from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * Six short reasons, laid out as a three-column grid rather than the numbered
 * vertical list a competitor would use, so it reads as our page and not a copy.
 * The numbers are a reading aid, so they stay out of the accessibility tree.
 */
export const Benefits: React.FC = () => (
  <Section tone="white">
    <h2 className="text-h2">{BENEFITS_HEADING}</h2>

    <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {BENEFITS.map((benefit, index) => (
        <div key={benefit.title}>
          <p aria-hidden="true" className="text-h3 text-gold-600 font-bold">
            {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="text-h3 mt-2">{benefit.title}</h3>
          <p className="text-body text-ink-600 mt-2 max-w-[45ch]">{benefit.body}</p>
        </div>
      ))}
    </div>
  </Section>
)
