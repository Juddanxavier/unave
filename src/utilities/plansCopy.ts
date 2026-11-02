/**
 * The words on `/plans` (spec 0007).
 *
 * The kitchen sells meal plans on the site again: pick a plan, choose how long
 * it runs, pay once. Browsing needs no account, and the page says so, because
 * the promise that nobody must sign in just to look around is one the site
 * keeps everywhere except at checkout.
 */

import { WHATSAPP_CTA_LABEL } from '@/utilities/whatsapp'

export const PLANS_PAGE_TITLE = 'Meal plans'
export const PLANS_PAGE_DESCRIPTION =
  'Home style meals on a plan: a week or a month of lunches and dinners, cooked in our kitchen and delivered to your door. Pay once, eat well every day.'

export const PLANS_HERO_EYEBROW = 'Meal plans'
export const PLANS_HERO_HEADLINE = 'Plan your week,'
export const PLANS_HERO_HEADLINE_ACCENT = 'skip the daily question'
export const PLANS_HERO_SUB =
  'Choose how long you want home style meals to arrive for. Pay once for the whole plan. No account needed to look around.'

export const PLANS_CTA_BROWSE = 'Browse the plans'
export const PLANS_CTA_MESSAGE = WHATSAPP_CTA_LABEL

export const PLANS_FINAL_HEADING = 'Ready when you are'
export const PLANS_FINAL_BODY =
  'Pick a plan and a duration, pay once at checkout, and the kitchen takes it from there. Questions first? We are one message away.'

export const PLANS_GRID_HEADING = 'The plans'
export const PLANS_GRID_INTRO =
  'Every plan is cooked fresh in our own kitchen and delivered on the days you choose. Pick a duration on the card and buy that plan in one go.'

export const PLANS_EMPTY_HEADING = 'No plans are open right now'
export const PLANS_EMPTY_BODY =
  'We are between menus. Message the kitchen and we will tell you what we can cook for you this week.'

export const PLANS_PAUSED_NOTE_TITLE = 'What "paused" means'
export const PLANS_PAUSED_NOTE_BODY =
  'A paused plan is still shown because it may come back, but it cannot be bought today. Message us if you were hoping to start with one of them.'

export const PLANS_HOW_HEADING = 'How a plan works'
export const PLANS_HOW_STEPS = [
  {
    body: 'Pick a plan and a duration. Looking around needs no account.',
    title: 'Choose your plan',
  },
  {
    body: 'At checkout you sign in, so the kitchen knows who ordered and where to deliver, then pay once.',
    title: 'Sign in and pay once',
  },
  {
    body: 'The kitchen sees the order right away and messages you about when deliveries begin.',
    title: 'We start cooking',
  },
]
