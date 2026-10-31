/** Fixed strings for the account page. */

export const ACCOUNT_TITLE = 'Your account'

export const ACCOUNT_INTRO = 'Your details, in one place, and how to reach the kitchen.'

export const ACCOUNT_SIGN_OUT_HINT =
  'Use Sign out in the menu at the top of the page when you are done.'

export const ACCOUNT_SESSION_EXPIRED = 'Your sign-in expired. Please sign in again.'

export const ACCOUNT_NOT_GIVEN = 'Not given'

export const ACCOUNT_DETAILS_HEADING = 'Account details'

export const ACCOUNT_DETAILS_INTRO = 'The details we use to reach you.'

export const ACCOUNT_NAME_LABEL = 'Name'

export const ACCOUNT_EMAIL_LABEL = 'Email'

export const ACCOUNT_MEMBER_SINCE_LABEL = 'Member since'

export const ACCOUNT_SIGN_IN_LABEL = 'Sign in with'

export const ACCOUNT_SIGN_IN_PASSWORD = 'Email and password'

export const ACCOUNT_SIGN_IN_GOOGLE = 'Google'

export const ACCOUNT_SET_PASSWORD_HINT =
  'You signed in with Google, so you do not have a password yet. Use Forgot your password on the sign in page to set one.'

export const ACCOUNT_HELP_HEADING = 'Need a hand?'

export const ACCOUNT_HELP_INTRO =
  'Questions about a delivery, an order or a change? Message us and we will sort it out.'

export const ACCOUNT_HELP_ABOUT = 'About the kitchen'

export const ACCOUNT_HELP_CONTACT = 'Message us'

/**
 * The delivery details and food preference the customer saves on this page.
 *
 * Address and phone are required here even though the profile as a whole is
 * optional: a customer who saves gives us the whole delivery set, never half an
 * address. The food preference alone stays optional.
 */
export const ACCOUNT_DELIVERY_HEADING = 'Delivery details'

export const ACCOUNT_DELIVERY_INTRO =
  'Where we bring your meals, and how to reach you. The kitchen also reads your food preference.'

export const ACCOUNT_PHONE_LABEL = 'Phone number'

export const ACCOUNT_ADDRESS_LINE1_LABEL = 'Address line 1'

export const ACCOUNT_ADDRESS_LINE2_LABEL = 'Address line 2 (optional)'

export const ACCOUNT_CITY_LABEL = 'City'

export const ACCOUNT_STATE_LABEL = 'State'

export const ACCOUNT_PINCODE_LABEL = 'Pincode'

export const ACCOUNT_FOOD_PREFERENCE_LABEL = 'Food preference'

export const ACCOUNT_FOOD_PREFERENCE_HINT =
  'Veg, vegan and similar. Optional, and you can change it any time.'

export const ACCOUNT_PROFILE_SAVE = 'Save details'

export const ACCOUNT_PROFILE_SAVED = 'Saved. We use these details when you order.'

export const ACCOUNT_PROFILE_INVALID = 'Please check the highlighted fields and try again.'

export const ACCOUNT_PROFILE_SAVE_FAILED =
  'We could not save your details just now. Please try again in a moment.'

/** Greet by first name when we have one, so the page does not feel like a console. */
export const accountGreeting = (name: string | null, email: string): string => {
  const first = name?.trim().split(/\s+/)[0]
  return `Hello, ${first && first.length > 0 ? first : email}`
}
