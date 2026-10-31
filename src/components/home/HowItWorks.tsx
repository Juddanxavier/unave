import React from 'react'

import { STEPS, STEPS_HEADING } from '@/utilities/homeCopy'

import { Section } from './Section'

export const HowItWorks: React.FC = () => (
  <Section id="how-it-works">
    <h2 className="text-h2">{STEPS_HEADING}</h2>

    <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {STEPS.map((step, index) => (
        <li className="flex gap-4" key={step.title}>
          <span
            aria-hidden="true"
            className="text-h3 text-green-700 bg-gold-400 flex size-11 shrink-0 items-center justify-center rounded-pill font-bold"
          >
            {index + 1}
          </span>
          <div>
            <h3 className="text-h3">{step.title}</h3>
            <p className="text-body text-ink-600 mt-1">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  </Section>
)
