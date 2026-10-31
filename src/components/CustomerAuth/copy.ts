/**
 * Fixed strings for the customer account screens (design.md §6.16).
 *
 * These are code, not CMS copy. Half of them name a security state, and an editor
 * must not be able to soften "that email already has an account" into something
 * that hides it.
 */

export type CustomerAuthMode = 'sign-in' | 'sign-up'

interface CustomerAuthCopy {
  /** Page heading and the document title. */
  title: string
  /** The single line of context under the heading. */
  intro: string
  /** The quiet prompt that points at the other screen. */
  switchPrompt: string
  switchLabel: string
  switchHref: '/sign-in' | '/sign-up'
  /** The last button in the card. Both screens sign in, so both say sign in. */
  submit: string
}

export const CUSTOMER_AUTH_COPY: Record<CustomerAuthMode, CustomerAuthCopy> = {
  'sign-in': {
    intro: 'Sign in to see every plan we have for you, and to stop one whenever you like.',
    submit: 'Sign in',
    switchHref: '/sign-up',
    switchLabel: 'Sign up',
    switchPrompt: 'New to UNAVE?',
    title: 'See all your plans in one place',
  },
  'sign-up': {
    intro:
      'Create your account with a password or with Google. If you already have a plan with us, we will attach it to your account.',
    submit: 'Create account',
    switchHref: '/sign-in',
    switchLabel: 'Sign in',
    switchPrompt: 'Already have an account?',
    title: 'One account for every plan',
  },
}

export const CUSTOMER_AUTH_EMAIL_LABEL = 'Email address'
export const CUSTOMER_AUTH_FOOD_PREFERENCE_LABEL = 'Food preference (optional)'
export const CUSTOMER_AUTH_FOOD_PREFERENCE_HINT =
  'Veg, vegan and similar, so the kitchen knows what to cook for you. You can change it later on your account page.'
export const CUSTOMER_AUTH_PASSWORD_LABEL = 'Password'
export const CUSTOMER_AUTH_NEW_PASSWORD_LABEL = 'New password'
export const CUSTOMER_AUTH_CHOOSE_PASSWORD = 'Choose a password'
export const CUSTOMER_AUTH_PASSWORD_HINT = 'At least 10 characters.'
export const CUSTOMER_AUTH_DIVIDER = 'or'
export const CUSTOMER_AUTH_CTA = 'Continue with Google'
export const CUSTOMER_AUTH_FORGOT = 'Forgot your password?'
export const CUSTOMER_AUTH_RESEND = 'Send it again'
export const CUSTOMER_AUTH_SHOW_PASSWORD = 'Show password'
export const CUSTOMER_AUTH_HIDE_PASSWORD = 'Hide password'

/**
 * The brand half of the account screens.
 *
 * It says what an account is for, not what it unlocks: the form beside it is the
 * only way in, so this panel is reassurance rather than a sales pitch.
 */
export const AUTH_BRAND = {
  backLink: 'Back to menu',
  eyebrow: 'Your account',
  intro:
    'See what you ordered, when it starts and ends, and stop a plan whenever you like. One account covers every plan you buy.',
  points: [
    'See every plan tied to your email address',
    'Stop a plan without hunting for an old email',
    'Sign in once, on any device',
  ],
  title: 'Your plans, always in reach',
}

/**
 * What we actually do, now that an account has a password. This replaces the old
 * "No password, ever." line, which stopped being true the moment this form shipped.
 */
export const CUSTOMER_AUTH_PRIVACY =
  'We use your email address to show your plans and to send you messages about them. Nothing else.'

export const CUSTOMER_AUTH_UNAVAILABLE =
  'Google sign-in is not switched on yet. Use your email address and password, or contact us and we will help you with your plan.'

/**
 * Things that worked. Green enough to notice, quiet enough not to shout, and each
 * one says what to do next rather than only what happened.
 */
export const CUSTOMER_AUTH_NOTICES: Record<string, string> = {
  registered:
    'Check your inbox for the link that confirms your address. Open it, then sign in here.',
  resent: 'If that address still needs confirming, a new link is on its way.',
  sent: 'If that address has an account, a link to choose a new password is on its way.',
  verified: 'Your email address is confirmed. Sign in to see your plans.',
}

/**
 * One plain line per failure. Deliberately neutral wording: nothing was destroyed,
 * so none of these deserve an alarming tone.
 */
export const CUSTOMER_AUTH_ERRORS: Record<string, string> = {
  credentials: 'That email address and password do not match. Please try again.',
  email: 'Please enter a valid email address.',
  exists:
    'That email address already has an account. Sign in instead, or use Forgot your password to set a new one.',
  exchange: 'That sign-in did not finish. Please try again.',
  locked: 'Too many attempts on that account. Please wait a few minutes and try again.',
  mail: 'We could not send that email just now. Please try again in a moment.',
  password: 'Please use at least 10 characters for your password.',
  profile: 'We could not confirm your Google account. Please try again or use another one.',
  session: 'That did not finish. Please try again.',
  slow: 'Too many attempts just now. Please wait a minute and try again.',
  state: 'That sign-in expired before it finished. Please try again.',
  unverified:
    'This account is not confirmed yet. Open the link we emailed you, or ask for a new one below.',
  verify: 'That confirmation link has already been used. Sign in and we will send you a new one.',
}

export const customerAuthError = (code: string | undefined): string | null => {
  if (!code) return null

  return CUSTOMER_AUTH_ERRORS[code] ?? CUSTOMER_AUTH_ERRORS.session
}

export const customerAuthNotice = (code: string | undefined): string | null => {
  if (!code) return null

  return CUSTOMER_AUTH_NOTICES[code] ?? null
}

/** The forgot-password card. */
export const FORGOT_COPY = {
  intro:
    'Enter the email address you signed up with. We will send you a link to choose a new password.',
  submit: 'Send reset link',
  title: 'Reset your password',
}

/** The reset-password card, reached from the link in that email. */
export const RESET_COPY = {
  intro:
    'Choose a password you have not used here before. You will be signed in straight away.',
  missingToken:
    'This link is missing the code it needs. Ask for a new one and it will work.',
  missingTokenAction: 'Ask for a new link',
  submit: 'Save new password',
  title: 'Choose a new password',
}
