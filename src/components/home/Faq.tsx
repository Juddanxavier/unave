import { ChevronDown } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

import { FAQ, FAQ_HEADING, FAQ_PHOTO, IMAGES } from '@/utilities/homeCopy'

import { Section } from './Section'

export interface FaqItem {
  question: string
  answer: string
}

interface Props {
  heading?: string
  /** The home page's questions by default; a page with its own questions passes its own. */
  items?: readonly FaqItem[]
  /** The photograph beside the questions. */
  image?: { alt: string; src: string }
}

/**
 * Native <details> rather than a scripted accordion: it is keyboard operable and
 * announced correctly with no JavaScript, which matters more than the exact
 * `aria-expanded` implementation in design.md §6.10. The first answer starts open.
 *
 * From large screens the questions sit in the right column with a photograph to
 * their left. Below that the questions come first and the photograph follows, so
 * the section still opens on its heading.
 */
export const Faq: React.FC<Props> = ({
  heading = FAQ_HEADING,
  image = { alt: FAQ_PHOTO, src: IMAGES.faq },
  items = FAQ,
}) => (
  <Section id="faq">
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="text-h2">{heading}</h2>

        <div className="border-line mt-8 border-t">
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
      </div>

      <div className="ring-green-900/10 relative aspect-[5/4] overflow-hidden rounded-lg shadow-md ring-1 lg:order-first">
        <Image
          alt={image.alt}
          className="object-cover"
          fill
          quality={75}
          sizes="(min-width: 1024px) 560px, 100vw"
          src={image.src}
        />
      </div>
    </div>
  </Section>
)
