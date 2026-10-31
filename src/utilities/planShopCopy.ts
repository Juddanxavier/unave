/**
 * Every fixed string the public plan pages and the cart show. Kept in one
 * module so the listing, the detail, the cart and the header cannot drift.
 */

export const PLANS_PAGE_TITLE = 'Plans'
export const PLANS_PAGE_DESCRIPTION =
  'Weekly and monthly food plans from Unave. Pick a plan and see what is included.'
export const PLANS_HEADING = 'Plans'
export const PLANS_INTRO = 'Pick the plan that fits your week.'
export const PLANS_EMPTY = 'No plans are available right now.'
export const PLANS_EMPTY_ACTION = 'Contact us'
export const PLANS_LINK_LABEL = 'Plans'

/** The plans page hero (design.md §6.3 trust row, §6.17). */
export const PLANS_HERO_EYEBROW = 'Meal plans'
export const PLANS_HERO_HEADLINE = 'Plans that fit'
export const PLANS_HERO_HEADLINE_ACCENT = 'your week'
export const PLANS_HERO_SUB =
  'A few simple ways to eat from our kitchen all week. Compare them here, open one for the details, and change your mind whenever you like.'
export const PLANS_HERO_CTA = 'Compare plans'

/** The toolbar above the plan list. One GET form, so it all works without JavaScript. */
export const PLANS_SEARCH_LABEL = 'Search plans'
export const PLANS_SEARCH_PLACEHOLDER = 'Try “breakfast”'
export const PLANS_PERIOD_LABEL = 'Billing period'
export const PLANS_MEALS_LABEL = 'Meals a week'
export const PLANS_SORT_LABEL = 'Sort by'
export const PLANS_APPLY = 'Apply filters'
export const PLANS_CLEAR = 'Clear filters'
export const PLANS_VIEW_LABEL = 'View'

/**
 * The count line above the results. One page reads as *all*; a filtered single page
 * names the share; a paginated one names the window this page shows.
 */
export const plansCountLine = (
  shown: number,
  total: number,
  range?: { from: number; to: number },
): string => {
  const word = total === 1 ? 'plan' : 'plans'

  if (range && shown < total) return `Showing ${range.from}–${range.to} of ${total} ${word}`

  return shown === total
    ? `Showing all ${total} ${word}`
    : `Showing ${shown} of ${total} ${word}`
}

export const PLANS_NO_MATCH = 'No plans match that search or those filters.'
export const PLANS_PRICE_NOTE =
  'Prices and delivery details are shown on each plan page before you pay.'

/** The plans page's own questions (design.md §6.17). Different from the home page's. */
export const PLANS_FAQ_HEADING = 'Plan questions'
export const PLANS_FAQ = [
  {
    question: 'How do weekly and monthly plans differ?',
    answer:
      'Only in how long one paid period runs. A weekly plan covers one week and a monthly plan covers a month. Each plan page shows its price for one full period before you pay.',
  },
  {
    question: 'What does a plan include?',
    answer:
      'The plan page lists exactly what you get: which meals arrive, how many a week, and the price for one period. Nothing is added later without your confirmation.',
  },
  {
    question: 'Can I change or stop a plan after I start it?',
    answer:
      'Yes. Every plan you buy lives in your account, where you can read it or stop it whenever you like. Nothing changes until you confirm it.',
  },
  {
    question: 'Do I need an account to browse or order?',
    answer:
      'No. You can look through the menu and order without one. An account is only for keeping the plans you have bought in one place.',
  },
] as const

export const PLAN_DETAIL_FALLBACK_DESCRIPTION = 'A food plan from Unave.'
export const PLAN_BACK = 'Back to all plans'
export const PLAN_HIGHLIGHTS = 'What you get'
export const PLAN_ADD = 'Add to cart'

export const CART_TITLE = 'Your cart'
export const CART_HEADING = 'Your cart'
export const CART_EMPTY = 'Your cart is empty'
export const CART_EMPTY_ACTION = 'Browse plans'
export const CART_UNAVAILABLE = 'That plan is no longer available.'
export const CART_REMOVE = 'Remove'
export const CART_CHECKOUT = 'Pay and start'
export const CART_CHECKOUT_NOTE =
  'One payment buys one period of the plan. It renews only when you pay again — nothing is charged automatically.'
export const CART_BROWSE = 'Browse all plans'

/** The checkout step on the cart page (spec 0007). */
export const CHECKOUT_DETAILS_HEADING = 'Delivery details'
export const CHECKOUT_NAME_LABEL = 'Name'
export const CHECKOUT_EMAIL_LABEL = 'Email'
export const CHECKOUT_EMAIL_LOCKED_HINT = 'Signed in. Sign out to order for another address.'
export const CHECKOUT_PHONE_LABEL = 'Phone'
export const CHECKOUT_ADDRESS_LINE1_LABEL = 'Address line 1'
export const CHECKOUT_ADDRESS_LINE2_LABEL = 'Address line 2 (optional)'
export const CHECKOUT_CITY_LABEL = 'City'
export const CHECKOUT_STATE_LABEL = 'State'
export const CHECKOUT_PINCODE_LABEL = 'Pincode'
export const CART_PAY = 'Pay and start'
export const CART_PAYING = 'Opening the payment window…'
export const CART_PAY_SECURE_NOTE =
  'Payments run on Razorpay. Your card or UPI details never reach our servers.'
export const CART_CHECKOUT_UNAVAILABLE =
  'Online payment is not available right now. Please try again in a little while.'
export const CART_CHECKOUT_REJECTED = 'We could not start checkout. Please try again.'
export const CART_CHECKOUT_LIMITED =
  'Too many checkout attempts. Please try again in a few minutes.'
export const CART_CHECKOUT_DETAILS_INVALID = 'Check the highlighted fields and try again.'
export const CART_CHECKOUT_CONFIRM_FAILED =
  'We could not confirm your payment. If money left your account, contact us and we will make it right.'
export const CART_PAYMENT_CLOSED =
  'The payment window closed before it finished. Nothing was started — try again when you are ready.'

/** The page a successful checkout lands on. */
export const ORDER_PLACED_TITLE = 'Order placed'
export const ORDER_PLACED_HEADING = 'Your plan is starting'
export const ORDER_PLACED_BODY =
  'Your first payment is in and your plan starts tomorrow. A confirmation email with the details is on its way.'
export const ORDER_PLACED_ACCOUNT = 'View your plans'
export const ORDER_PLACED_BROWSE = 'Browse all plans'

export const priceLine = (price: string | null, period: string | null): string | null => {
  if (!price || !period) return null

  return `${price} per ${period}`
}

export const mealsLine = (count: number | null | undefined): string | null => {
  if (typeof count !== 'number' || !Number.isFinite(count)) return null
  if (count === 1) return '1 meal a week'

  return `${count} meals a week`
}