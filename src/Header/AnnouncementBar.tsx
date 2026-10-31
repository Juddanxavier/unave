import Link from 'next/link'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

type Announcement = NonNullable<HeaderType['announcement']>

interface Props {
  announcement?: Announcement | null
}

/**
 * The strip above the navbar (design.md §6.2). It pins to the top of the viewport
 * together with the bar beneath it, so the news stays visible while scrolling.
 *
 * The whole bar is one link, so the tap target is the full strip rather than a
 * small word inside it (design.md §12). No countdown and no invented scarcity
 * (design.md §1).
 */
export const AnnouncementBar: React.FC<Props> = ({ announcement }) => {
  const { enabled, linkLabel, linkUrl, newTab, note, text } = announcement ?? {}

  if (!enabled || !linkUrl || (!text && !note)) return null

  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  return (
    <Link
      className="bg-green-900 text-cream hover:bg-green-800 block transition-colors motion-reduce:transition-none"
      href={linkUrl}
      {...newTabProps}
    >
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 py-3 text-center">
        {text ? <span className="text-caption text-gold-400 font-bold">{text}</span> : null}
        {note ? <span className="text-caption text-cream/70">{note}</span> : null}
        {linkLabel ? (
          <span className="text-caption text-gold-400 underline underline-offset-4">
            {linkLabel}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
