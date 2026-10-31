import React from 'react'

import { AUTH_INPUT, AUTH_LABEL, AUTH_PROBLEM } from '@/components/CustomerAuth/styles'
import { Button } from '@/components/ui/button'
import { ENQUIRY_HONEYPOT_FIELD } from '@/collections/Enquiries/schema'
import { cn } from '@/utilities/ui'
import {
  CONTACT_EMAIL_LABEL,
  CONTACT_FORM_NOTE,
  CONTACT_HONEYPOT_LABEL,
  CONTACT_MESSAGE_LABEL,
  CONTACT_MESSAGE_PLACEHOLDER,
  CONTACT_NAME_LABEL,
  CONTACT_PHONE_LABEL,
  CONTACT_SUBMIT,
} from '@/utilities/contactCopy'

/**
 * The enquiry form (design.md §6.12), as a plain HTML `method="post"` form.
 *
 * It posts to the Payload endpoint `/api/enquiries/send` and works without
 * JavaScript, like every other public form on the site. The browser's own
 * `required` and `type=email` checks are the first gate, so an honest visitor
 * never loses typed text; the server validates again with the same rules and
 * answers a crafted post with one plain error line instead of the form.
 */
export const ContactForm: React.FC<{ error?: string }> = ({ error }) => (
  <form action="/api/enquiries/send" className="flex flex-col gap-6" method="post">
    {error ? (
      <p className={AUTH_PROBLEM} role="alert">
        {error}
      </p>
    ) : null}

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className={AUTH_LABEL} htmlFor="contact-name">
          {CONTACT_NAME_LABEL}
        </label>
        <input
          autoComplete="name"
          className={AUTH_INPUT}
          id="contact-name"
          maxLength={80}
          name="name"
          required
          type="text"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={AUTH_LABEL} htmlFor="contact-phone">
          {CONTACT_PHONE_LABEL}
        </label>
        <input
          autoComplete="tel"
          className={AUTH_INPUT}
          id="contact-phone"
          inputMode="tel"
          maxLength={20}
          name="phone"
          type="tel"
        />
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <label className={AUTH_LABEL} htmlFor="contact-email">
        {CONTACT_EMAIL_LABEL}
      </label>
      <input
        autoComplete="email"
        className={AUTH_INPUT}
        id="contact-email"
        maxLength={254}
        name="email"
        required
        type="email"
      />
    </div>

    <div className="flex flex-col gap-2">
      <label className={AUTH_LABEL} htmlFor="contact-message">
        {CONTACT_MESSAGE_LABEL}
      </label>
      <textarea
        className={cn(AUTH_INPUT, 'h-auto min-h-36 py-3')}
        id="contact-message"
        maxLength={2000}
        name="message"
        placeholder={CONTACT_MESSAGE_PLACEHOLDER}
        required
        rows={6}
      />
    </div>

    {/*
      The honeypot: visually hidden and skipped by keyboard and screen readers.
      A script that fills it is answered with success and sends nothing.
    */}
    <div aria-hidden="true" className="hidden">
      <label htmlFor="contact-website">{CONTACT_HONEYPOT_LABEL}</label>
      <input
        autoComplete="off"
        id="contact-website"
        name={ENQUIRY_HONEYPOT_FIELD}
        tabIndex={-1}
        type="text"
      />
    </div>

    <div>
      <Button type="submit">{CONTACT_SUBMIT}</Button>
      <p className="text-ink-600 mt-3 text-sm leading-6">{CONTACT_FORM_NOTE}</p>
    </div>
  </form>
)
