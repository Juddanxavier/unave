import { ChevronDown } from 'lucide-react'
import React from 'react'

import { FAQ, FAQ_HEADING } from '@/utilities/homeCopy'

import { Section } from './Section'

export interface FaqItem {
  question: string
  answer: string
}

interface Props {
  heading?: string
  /** The home page's questions by default; a page with its own questions passes its own. */
  items?: readonly FaqItem[]
}

/**
 * Native <details> rather than a scripted accordion: it is keyboard operable and
 * announced correctly with no JavaScript, which matters more than the exact
 * `aria-expanded` implementation in design.md §6.10. The first answer starts open.
 */
export const Faq: React.FC<Props> = ({ heading = FAQ_HEADING, items = FAQ }) => (
  <Section id="faq">
    <h2 className="text-h2">{heading}</h2>

    <div className="border-line mt-8 max-w-[80ch] border-t">
      {items.map((item, index) => (
        <details
          className="group border-line open:bg-green-50 rounded-md border-b px-5"
          key={item.question}
          open={index === 0}
        >
          <summary className="text-h3 flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              aria-hidden="true"
              className="text-green-700 size-5 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </summary>

          <p className="text-body text-ink-600 max-w-[70ch] pb-5">{item.answer}</p>
        </details>
      ))}
    </div>
  </Section>
)
