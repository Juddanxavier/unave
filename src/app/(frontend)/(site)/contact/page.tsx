import type { Metadata } from 'next'
import { ArrowRight, CheckCircle2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import {
  CONTACT_FORM_HEADING,
  CONTACT_FORM_INTRO,
  CONTACT_HERO_EYEBROW,
  CONTACT_HERO_HEADLINE,
  CONTACT_HERO_HEADLINE_ACCENT,
  CONTACT_HERO_SUB,
  CONTACT_IMAGES,
  CONTACT_PAGE_DESCRIPTION,
  CONTACT_PAGE_TITLE,
  CONTACT_SENT_BODY,
  CONTACT_SENT_HEADING,
  CONTACT_WAY_CALL,
  CONTACT_WAY_CALL_NOTE,
  CONTACT_WAY_CALL_TITLE,
  CONTACT_WAY_EMAIL,
  CONTACT_WAY_EMAIL_NOTE,
  CONTACT_WAY_EMAIL_TITLE,
  CONTACT_WAY_WHATSAPP,
  CONTACT_WAY_WHATSAPP_NOTE,
  CONTACT_WAY_WHATSAPP_TITLE,
  CONTACT_WAYS_HEADING,
  CONTACT_WAYS_INTRO,
  contactError,
} from '@/utilities/contactCopy'

import { ContactForm } from './ContactForm'

/** The page reads the query string for the form's answer, so it is never static. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/contact' },
  description: CONTACT_PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: CONTACT_PAGE_DESCRIPTION,
    title: CONTACT_PAGE_TITLE,
    url: '/contact',
  }),
  title: CONTACT_PAGE_TITLE,
}

type SearchParams = Record<string, string | string[] | undefined>

const firstValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? ''

const CARD_BASE =
  'group block rounded-2xl border border-line bg-card p-6 transition-colors hover:border-green-600 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none motion-reduce:transition-none'

const ACTION_LINE = 'text-green-700 mt-4 inline-flex items-center gap-2 font-semibold'

const ICON_CHIP = 'bg-green-100 text-green-700 grid size-11 place-items-center rounded-full'

/**
 * The contact page (spec 0006). The ways to reach us come from the same contact
 * group the footer manages, so the kitchen edits them once and both surfaces
 * follow. Only the ways that are configured appear; the form is always there.
 */
export default async function ContactPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const sent = firstValue(params.sent) === '1'
  const error = contactError(firstValue(params.error) || undefined)

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const contact = footer?.contact ?? null
  const hasWays = Boolean(contact?.phone || contact?.email || contact?.whatsapp)

  return (
    <main>
      <Section
        className="overflow-hidden bg-green-900 md:py-20"
        image={{ priority: true, src: CONTACT_IMAGES.hero }}
        overlay="bg-green-900/85"
        tone="green"
      >
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          <p className="text-eyebrow text-gold-400 uppercase">{CONTACT_HERO_EYEBROW}</p>

          <h1 className="text-display mt-4 text-balance">
            {CONTACT_HERO_HEADLINE}{' '}
            <span className="text-gold-400 whitespace-nowrap italic">
              {CONTACT_HERO_HEADLINE_ACCENT}
            </span>
          </h1>

          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{CONTACT_HERO_SUB}</p>

          {contact?.whatsapp ? (
            <div className="mt-8">
              <Cta
                href={`https://wa.me/${contact.whatsapp}`}
                rel="noopener noreferrer"
                target="_blank"
                variant="onDark"
              >
                {CONTACT_WAY_WHATSAPP}
              </Cta>
            </div>
          ) : null}
        </div>
      </Section>

      {sent ? (
        <Section id="message" tone="white">
          <div className="max-w-[52ch]">
            <CheckCircle2 aria-hidden="true" className="size-10 text-green-700" strokeWidth={2} />
            <h2 className="text-h2 mt-4">{CONTACT_SENT_HEADING}</h2>
            <p className="text-body text-ink-600 mt-3">{CONTACT_SENT_BODY}</p>

            {contact?.whatsapp ? (
              <div className="mt-8">
                <Cta href={`https://wa.me/${contact.whatsapp}`} variant="primary">
                  {CONTACT_WAY_WHATSAPP}
                </Cta>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {hasWays ? (
        <Section tone="tint">
          <h2 className="text-h2">{CONTACT_WAYS_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{CONTACT_WAYS_INTRO}</p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {contact?.whatsapp ? (
              <a
                className={CARD_BASE}
                href={`https://wa.me/${contact.whatsapp}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className={ICON_CHIP}>
                  <MessageCircle aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <h3 className="text-h3 mt-4">{CONTACT_WAY_WHATSAPP_TITLE}</h3>
                <p className="text-body text-ink-900 mt-2 font-semibold">{contact.whatsapp}</p>
                <p className="text-body text-ink-600 mt-2">{CONTACT_WAY_WHATSAPP_NOTE}</p>
                <span className={ACTION_LINE}>
                  {CONTACT_WAY_WHATSAPP}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    strokeWidth={2}
                  />
                </span>
              </a>
            ) : null}

            {contact?.phone ? (
              <a className={CARD_BASE} href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>
                <span className={ICON_CHIP}>
                  <Phone aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <h3 className="text-h3 mt-4">{CONTACT_WAY_CALL_TITLE}</h3>
                <p className="text-body text-ink-900 mt-2 font-semibold">{contact.phone}</p>
                <p className="text-body text-ink-600 mt-2">{CONTACT_WAY_CALL_NOTE}</p>
                <span className={ACTION_LINE}>
                  {CONTACT_WAY_CALL}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    strokeWidth={2}
                  />
                </span>
              </a>
            ) : null}

            {contact?.email ? (
              <a className={CARD_BASE} href={`mailto:${contact.email}`}>
                <span className={ICON_CHIP}>
                  <Mail aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <h3 className="text-h3 mt-4">{CONTACT_WAY_EMAIL_TITLE}</h3>
                <p className="text-body text-ink-900 mt-2 truncate font-semibold">
                  {contact.email}
                </p>
                <p className="text-body text-ink-600 mt-2">{CONTACT_WAY_EMAIL_NOTE}</p>
                <span className={ACTION_LINE}>
                  {CONTACT_WAY_EMAIL}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    strokeWidth={2}
                  />
                </span>
              </a>
            ) : null}
          </div>

          {contact?.address ? (
            <p className="text-body text-ink-600 mt-8 flex items-start gap-2">
              <MapPin aria-hidden="true" className="text-green-700 mt-1 size-4 shrink-0" strokeWidth={2} />
              {contact.address}
            </p>
          ) : null}
        </Section>
      ) : null}

      {!sent ? (
        <Section id="message" tone="white">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
            <div>
              <h2 className="text-h2">{CONTACT_FORM_HEADING}</h2>
              <p className="text-body text-ink-600 mt-3 max-w-[45ch]">{CONTACT_FORM_INTRO}</p>
            </div>

            <ContactForm error={error} />
          </div>
        </Section>
      ) : null}
    </main>
  )
}
