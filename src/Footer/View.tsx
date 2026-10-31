import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { Footer as FooterType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { Swoosh } from '@/components/Swoosh'
import { cn } from '@/utilities/ui'

const COLUMN_HEADING = 'text-eyebrow text-gold-400 uppercase'

const LINK_CLASS =
  'text-cream/75 hover:text-gold-400 inline-flex min-h-11 items-center rounded-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:outline-none motion-reduce:transition-none'

const CONTACT_ICON = 'text-gold-400 size-4 shrink-0'

/**
 * The footer (design.md §6.15): the brand and its one-line promise on the left, then
 * Explore, Policies and Contact as equal columns on the right, then the small print.
 * The swoosh sits behind it at low opacity so the page closes the way it opens.
 */
export const FooterView: React.FC<{ data: FooterType }> = ({ data }) => {
  const columns = data?.columns || []
  const contact = data?.contact
  const hasContact = Boolean(
    contact?.phone || contact?.email || contact?.whatsapp || contact?.address,
  )
  const totalColumns = columns.length + (hasContact ? 1 : 0)

  return (
    <footer className="bg-green-900 text-cream text-body relative mt-auto overflow-hidden border-t border-gold-400/25">
      <Swoosh className="-right-40 -bottom-56 w-[32rem] text-gold-400/[0.035]" />

      <div className="container relative">
        <div className="grid gap-12 py-14 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <Link
              aria-label="UNAVE home"
              className="text-gold-400 [--logo-height:42px] inline-flex"
              href="/"
            >
              <Logo />
            </Link>
            {data?.tagline ? <p className="text-cream/70 mt-6">{data.tagline}</p> : null}
          </div>

          <div
            className={cn(
              'grid grid-cols-2 gap-x-6 gap-y-10',
              totalColumns >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
            )}
          >
            {columns.map((column, index) => (
              <nav aria-labelledby={`footer-column-${index}`} key={column.id ?? index}>
                <h2 className={COLUMN_HEADING} id={`footer-column-${index}`}>
                  {column.title}
                </h2>
                <ul className="mt-3">
                  {(column.links || []).map(({ link }, linkIndex) => (
                    <li key={link?.label ?? linkIndex}>
                      <CMSLink {...link} appearance="inline" className={LINK_CLASS} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {hasContact ? (
              <div className="col-span-2 lg:col-span-1">
                <h2 className={COLUMN_HEADING}>Contact</h2>
                <ul className="mt-3">
                  {contact?.phone ? (
                    <li className="flex items-center gap-3">
                      <Phone aria-hidden="true" className={CONTACT_ICON} strokeWidth={2} />
                      <a
                        className={LINK_CLASS}
                        href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                      >
                        {contact.phone}
                      </a>
                    </li>
                  ) : null}
                  {contact?.email ? (
                    <li className="flex items-center gap-3">
                      <Mail aria-hidden="true" className={CONTACT_ICON} strokeWidth={2} />
                      <a className={LINK_CLASS} href={`mailto:${contact.email}`}>
                        {contact.email}
                      </a>
                    </li>
                  ) : null}
                  {contact?.whatsapp ? (
                    <li className="flex items-center gap-3">
                      <MessageCircle aria-hidden="true" className={CONTACT_ICON} strokeWidth={2} />
                      <a
                        className={LINK_CLASS}
                        href={`https://wa.me/${contact.whatsapp}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        WhatsApp
                      </a>
                    </li>
                  ) : null}
                  {contact?.address ? (
                    <li className="flex items-start gap-3 pt-1">
                      <MapPin
                        aria-hidden="true"
                        className={cn(CONTACT_ICON, 'mt-3')}
                        strokeWidth={2}
                      />
                      <span className="text-cream/70">{contact.address}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-cream/10 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          {data?.notice ? (
            <p className="text-caption text-cream/60 max-w-[70ch]">{data.notice}</p>
          ) : (
            <span />
          )}
          {data?.copyright ? (
            <p className="text-caption text-cream/50 shrink-0 sm:pr-16">{data.copyright}</p>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
