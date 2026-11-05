/**
 * The words and labels for the plan category pages (spec 0008).
 *
 * One shared source, by rule of spec 0008: the three category route values,
 * their display labels, and the words on each category page all live here, so
 * a label never says one thing on a plan card and another on its page. The
 * audience labels live here too, for the same reason: the badge on a card and
 * the filter pill on a category page must agree.
 *
 * The plans themselves stay CMS data. Only these words are code, like every
 * other page in this site.
 */

import type { Plan } from '@/payload-types'

/** The three category values, which are also the three route slugs. */
export const PLAN_CATEGORY_VALUES = ['ready-to-cook', 'ready-to-eat', 'fresh-from-produce'] as const

export type PlanCategoryValue = (typeof PLAN_CATEGORY_VALUES)[number]

export const isPlanCategory = (value: string): value is PlanCategoryValue =>
  (PLAN_CATEGORY_VALUES as readonly string[]).includes(value)

/** The web address of a category page, the one route map every link uses. */
export const planCategoryHref = (category: PlanCategoryValue): string => `/plans/${category}`

/** Label map shared by the plan card badges and the category pages. */
export const CATEGORY_LABEL: Record<Plan['category'], string> = {
  'fresh-from-produce': 'Fresh from produce',
  'ready-to-cook': 'Ready to cook',
  'ready-to-eat': 'Ready to eat',
}

/** Label map shared by the plan card badges and the filter pills. */
export const AUDIENCE_LABEL: Record<Plan['audience'], string> = {
  adults: 'Adults',
  kids: 'Kids',
  special: 'Special',
}

/** The filter pills: every audience, plus All, which is the default. */
export const AUDIENCE_FILTER_ORDER = ['all', 'kids', 'adults', 'special'] as const

export type PlanAudienceFilterValue = (typeof AUDIENCE_FILTER_ORDER)[number]

export const AUDIENCE_FILTER_LABEL: Record<PlanAudienceFilterValue, string> = {
  adults: AUDIENCE_LABEL.adults,
  all: 'All',
  kids: AUDIENCE_LABEL.kids,
  special: AUDIENCE_LABEL.special,
}

/** Accessible name for the category badge turned link on a plan card. */
export const categoryBadgeAriaLabel = (category: PlanCategoryValue): string =>
  `Browse ${CATEGORY_LABEL[category]} plans`

interface PlanCategoryCopy {
  /** The small label above the headline in the opening band. */
  eyebrow: string
  /** The main headline, with the italic gold accent that follows it. */
  headline: string
  headlineAccent: string
  /** The one line intro under the headline. */
  intro: string
  gridHeading: string
  gridIntro: string
  metaDescription: string
  metaTitle: string
}

/** The words on each category page, keyed by the category value. */
export const PLAN_CATEGORY_COPY: Record<PlanCategoryValue, PlanCategoryCopy> = {
  'fresh-from-produce': {
    eyebrow: 'Fresh from produce',
    gridHeading: 'Fresh from produce plans',
    gridIntro:
      'Every plan follows the market, so what reaches you is at its best. Pick a duration on the card and buy that plan in one go.',
    headline: 'Straight from the market,',
    headlineAccent: 'to your table',
    intro:
      'Built on what is fresh this week: fruits and vegetables at their best, cleaned and cut or cooked simply. Honest food that lets the season lead.',
    metaDescription:
      'Meal plans built on fresh fruits and vegetables, cleaned, cut or cooked simply. Fresh from produce plans from the UNAVE kitchen.',
    metaTitle: 'Fresh from produce plans',
  },
  'ready-to-cook': {
    eyebrow: 'Ready to cook',
    gridHeading: 'Ready to cook plans',
    gridIntro:
      'Every plan is prepped in our kitchen and delivered to yours. Pick a duration on the card and buy that plan in one go.',
    headline: 'The chopping is done,',
    headlineAccent: 'the cooking is yours',
    intro:
      'Vegetables cleaned and cut, masalas measured, and the last step left to you. Home style food without the prep work, finished in your kitchen the way your family likes it.',
    metaDescription:
      'Chopped, measured and delivered: ready to cook meal plans that leave the last, best step of cooking to you. Pay once, cook easy every day.',
    metaTitle: 'Ready to cook plans',
  },
  'ready-to-eat': {
    eyebrow: 'Ready to eat',
    gridHeading: 'Ready to eat plans',
    gridIntro:
      'Every plan is cooked fresh in our kitchen and delivered on the days you choose. Pick a duration on the card and buy that plan in one go.',
    headline: 'Cooked in our kitchen,',
    headlineAccent: 'served at yours',
    intro:
      'Heat and eat. Home style meals cooked fresh in our kitchen and delivered to your door, so nobody at home has to stand at the stove.',
    metaDescription:
      'Home style meals cooked fresh in our kitchen and delivered to your door. Ready to eat plans: pay once, and eat well every day.',
    metaTitle: 'Ready to eat plans',
  },
}

/** The band call to action, which scrolls down to the grid on the same page. */
export const PLANS_CATEGORY_CTA_BROWSE = 'Browse these plans'

/** The closing section, shared word for word by all three category pages. */
export const PLANS_CATEGORY_FINAL_HEADING = 'Ready when you are'
export const PLANS_CATEGORY_FINAL_BODY =
  'Pick a plan on this shelf, pay once at checkout, and the kitchen takes it from there. Questions first? We are one message away.'

/**
 * The empty state, two ways, so the page never claims the shelf is empty when
 * it is only filtered (spec 0008, AC-3).
 */
export const PLANS_CATEGORY_FILTER_EMPTY_HEADING = 'Nothing under this filter'
export const PLANS_CATEGORY_FILTER_EMPTY_BODY =
  'No plan for that audience on this shelf right now. Pick another pill, or message the kitchen and we will tell you what we can cook.'
