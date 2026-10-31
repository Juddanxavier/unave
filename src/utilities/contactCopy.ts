/**
 * Every fixed string the contact page shows (spec 0006). Kept in one module so
 * the page, the form and the endpoint's error codes cannot drift: the codes the
 * `/api/enquiries/send` endpoint appends to the redirect are named here too.
 */

export const CONTACT_PAGE_TITLE = 'Contact us'
export const CONTACT_PAGE_DESCRIPTION =
  'Message UNAVE on WhatsApp, call the kitchen, or send the contact form. We usually reply within a day.'

export const CONTACT_HERO_EYEBROW = 'Contact'
export const CONTACT_HERO_HEADLINE = 'Talk to us'
export const CONTACT_HERO_HEADLINE_ACCENT = 'we read everything'
export const CONTACT_HERO_SUB =
  'Ask about plans, delivery in your area, allergies, or anything else. WhatsApp is the fastest way to reach us, and the form below lands in the same place.'

export const CONTACT_IMAGES = {
  hero: '/images/band-cta.jpg',
} as const

export const CONTACT_WAYS_HEADING = 'Ways to reach us'
export const CONTACT_WAYS_INTRO =
  'Any one of these is fine. WhatsApp is usually the quickest; the form suits a longer question.'
export const CONTACT_WAY_WHATSAPP_TITLE = 'WhatsApp'
export const CONTACT_WAY_WHATSAPP = 'Message us on WhatsApp'
export const CONTACT_WAY_WHATSAPP_NOTE = 'For quick questions and help choosing a plan.'
export const CONTACT_WAY_CALL_TITLE = 'Call the kitchen'
export const CONTACT_WAY_CALL = 'Call the kitchen'
export const CONTACT_WAY_CALL_NOTE = 'During cooking hours; if we miss you, we call back.'
export const CONTACT_WAY_EMAIL_TITLE = 'Email'
export const CONTACT_WAY_EMAIL = 'Write to us'
export const CONTACT_WAY_EMAIL_NOTE = 'For anything you would rather have in writing.'

export const CONTACT_FORM_HEADING = 'Send a message'
export const CONTACT_FORM_INTRO = 'Tell us what you need, and we will come back to you.'
export const CONTACT_NAME_LABEL = 'Your name'
export const CONTACT_PHONE_LABEL = 'Phone (optional)'
export const CONTACT_EMAIL_LABEL = 'Email'
export const CONTACT_MESSAGE_LABEL = 'Your message'
export const CONTACT_MESSAGE_PLACEHOLDER = 'What would you like to know?'
export const CONTACT_SUBMIT = 'Send message'
export const CONTACT_FORM_NOTE =
  'We use these details only to answer you, and never pass them on.'
export const CONTACT_HONEYPOT_LABEL = 'Leave this field empty'

export const CONTACT_SENT_HEADING = 'Thank you — we have it'
export const CONTACT_SENT_BODY =
  'Your message is with the kitchen. We usually reply within a day, and sooner on WhatsApp.'

/** One plain sentence per error code the endpoint can send back. */
export const contactError = (code?: string): string | undefined => {
  switch (code) {
    case 'email':
      return 'Please enter a valid email address.'
    case 'message':
      return 'Please add a few words about what you need.'
    case 'name':
      return 'Please tell us your name.'
    case 'phone':
      return 'Please check the phone number — at least 10 digits.'
    case 'session':
      return 'For your security this form can only be sent from this site. Please try again.'
    case 'slow':
      return 'That was a few messages too quickly. Please try again in a little while.'
    case 'tryagain':
      return 'Something went wrong on our side. Please try again in a moment.'
    default:
      return undefined
  }
}
