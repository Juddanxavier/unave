import { Quote } from 'lucide-react'
import React from 'react'

import { TESTIMONIALS, TESTIMONIALS_HEADING, TESTIMONIALS_PLACEHOLDER } from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * Proof, built and styled, but empty on purpose: the quotes in `homeCopy` are
 * marked placeholders. No health outcomes, no before and after, no star ratings
 * we cannot document (design.md §11).
 */
export const Testimonials: React.FC = () => (
  <Section tone="white">
    <h2 className="text-h2">{TESTIMONIALS_HEADING}</h2>

    <div className="mt-10 grid gap-6 lg:grid-cols-3">
      {TESTIMONIALS.map((item, index) => (
        <figure className="bg-green-50 rounded-md p-6" key={index}>
          <Quote aria-hidden="true" className="text-gold-400 size-6" strokeWidth={2} />

          <blockquote className="text-body text-ink-600 mt-4">{item.quote}</blockquote>

          <figcaption className="mt-4">
            <span className="text-caption text-ink-900 font-bold">{item.name}</span>
            <span className="text-caption text-ink-600"> · {item.note}</span>
          </figcaption>
        </figure>
      ))}
    </div>

    <p className="text-caption text-gold-600 mt-6 font-bold">{TESTIMONIALS_PLACEHOLDER}</p>
  </Section>
)
