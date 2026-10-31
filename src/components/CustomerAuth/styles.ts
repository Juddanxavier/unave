/**
 * The classes the account screens share.
 *
 * Kept together because all four screens are the same shape: a brand panel, a
 * heading, a small form and one primary action. Anything that needs more than a
 * handful of utilities belongs in a component, not here.
 */

/** 52px normally, 44px on a short screen — still the minimum target size. */
export const AUTH_INPUT =
  'border-line text-ink-900 placeholder:text-ink-400 focus:border-green-700 focus-visible:ring-green-500 h-13 short:h-11 w-full rounded-sm border bg-white text-base transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

/** Room for the leading glyph, so it never sits under the text. */
export const AUTH_INPUT_LEADING = 'pr-4 pl-12'

/** Room for the leading glyph and the trailing show/hide button. */
export const AUTH_INPUT_TRAILING = 'pr-14 pl-12'

/** Repainted when the browser or Zod has already rejected the value. */
export const AUTH_INPUT_INVALID = 'border-error focus:border-error focus-visible:ring-error'

export const AUTH_LABEL = 'text-ink-900 text-sm font-semibold'

export const AUTH_FIELD_ERROR = 'text-error text-sm leading-6'

export const AUTH_INLINE_LINK =
  'text-green-700 font-semibold underline underline-offset-4 hover:opacity-75 transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none'

/** The quiet green confirmations: registered, resent, verified. */
export const AUTH_NOTICE =
  'text-green-800 bg-green-50 border-green-500 rounded-sm border-l-4 p-4 text-sm leading-6'

/** Failures. A muted red, not the warning gold: nothing here is a medical note. */
export const AUTH_PROBLEM =
  'text-error bg-error/10 border-error rounded-sm border-l-4 p-4 text-sm leading-6'