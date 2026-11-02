/**
 * WhatsApp, in one place (design.md §6.1, §6.2).
 *
 * Every "message the kitchen" action on the site is a WhatsApp link, and they
 * all share the same wording and the same opening line, so a customer lands in
 * the chat with the question already half written. The number comes from the
 * footer's contact details, the kitchen's single source for it.
 */

export const WHATSAPP_CTA_LABEL = 'Message us on WhatsApp'

export const WHATSAPP_MESSAGE = 'Hi UNAVE, I have a question about your meals and plans.'

/**
 * Shown when the footer has no WhatsApp number yet, so a "message" button still
 * leads somewhere useful instead of disappearing.
 */
export const WHATSAPP_FALLBACK_LABEL = 'Message us'

/**
 * A `wa.me` link from a stored number. WhatsApp wants digits only, so a number
 * typed with a plus, spaces or dashes still opens the right chat. The opening
 * line is appended as `?text=` when there is one.
 */
export const whatsappHref = (number: string, message: null | string = WHATSAPP_MESSAGE): string => {
  const digits = number.replace(/[^0-9]/g, '')
  const text = message?.trim()

  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
