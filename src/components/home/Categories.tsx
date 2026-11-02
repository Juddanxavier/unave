import { Apple, Droplets, Leaf, Salad } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

import {
  CATEGORIES,
  CATEGORIES_HEADING,
  CATEGORIES_INTRO,
  NOTICE_BODY,
  NOTICE_TITLE,
} from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * Category accents and tints from design.md §3.4. The icon colour is the accent
 * where it stays legible on its tint; the gold accent is darkened to gold-600
 * because gold-400 on gold-100 fails contrast (design.md §3.5).
 */
const CATEGORY_STYLES = {
  healthy: { Icon: Leaf, tile: 'bg-cat-healthy-tint text-cat-healthy' },
  nutrition: { Icon: Apple, tile: 'bg-cat-nutrition-tint text-gold-600' },
  diet: { Icon: Salad, tile: 'bg-cat-diet-tint text-cat-diet' },
  diabetes: { Icon: Droplets, tile: 'bg-cat-diabetes-tint text-cat-diabetes' },
} as const

export const Categories: React.FC = () => (
  <Section tone="white">
    <h2 className="text-h2">{CATEGORIES_HEADING}</h2>
    <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{CATEGORIES_INTRO}</p>

    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORIES.map((category) => {
        const { Icon, tile } = CATEGORY_STYLES[category.accent]

        return (
          <article
            className="bg-card border-line group hover:shadow-md overflow-hidden rounded-md border transition-[transform,box-shadow] duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            key={category.name}
          >
            <div className="relative aspect-[4/3]">
              <Image
                alt=""
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                fill
                quality={75}
                sizes="(min-width: 64rem) 300px, (min-width: 40rem) 50vw, 100vw"
                src={category.image}
              />
              <div
                aria-hidden="true"
                className="from-green-900/50 absolute inset-0 bg-linear-to-t to-transparent"
              />
            </div>

            <div className="relative p-6">
              <span
                className={`-mt-10 mb-4 flex size-12 items-center justify-center rounded-pill shadow-sm ${tile}`}
                aria-hidden="true"
              >
                <Icon className="size-6" strokeWidth={2} />
              </span>

              <h3 className="text-h3">{category.name}</h3>
              <p className="text-body text-ink-600 mt-2">{category.description}</p>

              {'note' in category && category.note ? (
                <p className="text-caption text-warning bg-gold-100 mt-3 inline-block rounded-sm px-2 py-1">
                  {category.note}
                </p>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>

    {/* The disclaimer that has to sit near the dietary claim (design.md §6.11, §11) */}
    <aside className="bg-gold-100 border-gold-500 mt-10 rounded-md border-l-4 p-5 sm:p-6">
      <h3 className="text-ink-900 text-lg leading-snug font-bold">{NOTICE_TITLE}</h3>
      <p className="text-ink-900 mt-2 text-base leading-7">{NOTICE_BODY}</p>
    </aside>
  </Section>
)
