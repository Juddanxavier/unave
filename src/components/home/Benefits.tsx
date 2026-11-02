import React from 'react'

import { BENEFITS, BENEFITS_HEADING } from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * Six short reasons, one card each on the tinted band (design.md §6.7). The numeral
 * sits in a gold chip as a reading aid, so it stays out of the accessibility tree,
 * while the list itself carries the order for anyone using a screen reader.
 */
export const Benefits: React.FC = () => (
  <Section tone="tint">
    <h2 className="text-h2">{BENEFITS_HEADING}</h2>

    <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
      {BENEFITS.map((benefit, index) => (
        <li
          className="bg-card border-line rounded-md border p-6 shadow-sm"
          key={benefit.title}
        >
          <span className="bg-gold-100 text-gold-600 text-button grid size-11 place-items-center rounded-full font-bold tabular-nums">
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          </span>

          <h3 className="text-h3 mt-4">{benefit.title}</h3>
          <p className="text-body text-ink-600 mt-2">{benefit.body}</p>
        </li>
      ))}
    </ol>
  </Section>
)
