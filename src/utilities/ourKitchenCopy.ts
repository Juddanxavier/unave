/**
 * Every fixed string the our kitchen page shows. Kept in one module so the page
 * and any future reuse cannot drift, like homeCopy, aboutCopy and contactCopy.
 */

import { WHATSAPP_CTA_LABEL } from '@/utilities/whatsapp'

export const KITCHEN_PAGE_TITLE = 'Our kitchen'
export const KITCHEN_PAGE_DESCRIPTION =
  'Inside the UNAVE kitchen: how the day starts, how meals are cooked and portioned, and what we do the same way every time.'

export const KITCHEN_HERO_EYEBROW = 'Inside our kitchen'
export const KITCHEN_HERO_HEADLINE = 'Where your meals'
export const KITCHEN_HERO_HEADLINE_ACCENT = 'actually get cooked'
export const KITCHEN_HERO_SUB =
  'One kitchen, a small team, and a routine we keep to every morning. Here is what happens between fresh produce arriving and your box leaving for your door.'
export const KITCHEN_HERO_CTA = WHATSAPP_CTA_LABEL
export const KITCHEN_HERO_SECONDARY = 'Browse the plans'
export const KITCHEN_HERO_POINTS = [
  'Cooked the same morning',
  'Portioned by hand',
  'Checked before it leaves',
] as const

/** Photography (design.md §8): the band photo is decorative reinforcement. */
export const KITCHEN_IMAGES = {
  hero: '/images/kitchen.jpg',
} as const

export const KITCHEN_PROCESS_HEADING = 'What happens before your meal reaches you'
export const KITCHEN_PROCESS_INTRO =
  'A meal is more than what ends up on the plate. The kitchen works in the same order every day, from the produce coming in to the boxes going out.'
export const KITCHEN_PROCESS = [
  {
    body: 'Bought for the day’s menu, never for stock, checked on arrival and kept to what we will actually cook.',
    title: 'Fresh produce in',
  },
  {
    body: 'Washed, peeled and cut by hand in small lots, so nothing waits around half done.',
    title: 'Washed and cut',
  },
  {
    body: 'Cooked in batches small enough that the same pot and the same recipe are used every time.',
    title: 'Cooked in batches',
  },
  {
    body: 'Portioned to the menu, sealed, and labelled with what is inside the box.',
    title: 'Portioned and packed',
  },
  {
    body: 'Counted against the day’s list and sent out while the food is still fresh.',
    title: 'Checked and dispatched',
  },
] as const

export const KITCHEN_PREP_HEADING = 'Clean ingredients, careful preparation'
export const KITCHEN_PREP_INTRO =
  'Fresh produce needs more than a rinse. Everything is washed and cut on the morning it is cooked, in lots small enough for one person to keep an eye on.'
export const KITCHEN_PREP_PHOTOS = [
  {
    alt: 'A fresh salad of greens, avocado, pomegranate and seeds in a bowl',
    caption: 'Greens, seeds and fruit, prepped the same morning',
    image: '/images/gallery-2.jpg',
  },
  {
    alt: 'Chopped broccoli, tomato and corn laid out in a steel preparation tray',
    caption: 'Washed and cut by hand, in small lots',
    image: '/images/gallery-3.jpg',
  },
  {
    alt: 'Cooked rolls and a bowl of dip, ready to be packed',
    caption: 'Cooked in batches small enough to watch',
    image: '/images/gallery-1.jpg',
  },
] as const

export const KITCHEN_PLAN_HEADING = 'How we plan a plate'
export const KITCHEN_PLAN_INTRO =
  'The week is planned before anything is bought, so the meals make sense next to each other and nothing gets cooked twice.'
export const KITCHEN_PLAN = [
  {
    body: 'The menu is written first and the shopping follows it, not the other way around.',
    title: 'Planned a week at a time',
  },
  {
    body: 'A serving is portioned the same way on Tuesday and on Saturday, so you know what is arriving.',
    title: 'The same portion every time',
  },
  {
    body: 'Whole grains and vegetables carry the meal, with protein in every one. Portions are sized to satisfy, not to look small on a plate.',
    title: 'Protein, fibre and whole grains',
  },
  {
    body: 'Both are kept in check without flattening the taste. Lighter is a decision here, not a slogan.',
    title: 'Oil and salt, watched',
  },
] as const

export const KITCHEN_NOTICE_TITLE = 'A note on your goals'
export const KITCHEN_NOTICE_BODY =
  'Our meals are food, not treatment. We cook around diabetes, allergies and food preferences and we describe the food honestly, but we do not promise weight loss, muscle gain or any medical outcome. If you are managing a condition, please talk to your doctor or a dietitian, and we will cook to the plan they give you.'

export const KITCHEN_STANDARDS_HEADING = 'Hygiene is part of every step'
export const KITCHEN_STANDARDS_INTRO =
  'None of this is a special effort for a busy day. It is the routine the kitchen runs on, whether we are cooking for five people or fifty.'
export const KITCHEN_STANDARDS = [
  {
    body: 'Surfaces, boards and hands are cleaned between one job and the next, not once at the end of the day.',
    title: 'Clean as we go',
  },
  {
    body: 'Raw and cooked food never share a board, and nothing goes back into a container it has already left.',
    title: 'Raw kept apart',
  },
  {
    body: 'Every box is sealed and labelled with what is inside it, so nothing has to be guessed at your end.',
    title: 'Sealed and labelled',
  },
  {
    body: 'The same order of work every morning, so a busy day never changes how the food is handled.',
    title: 'One routine, every day',
  },
] as const

export const KITCHEN_FINAL_HEADING = 'Fresh meals start in this kitchen'
export const KITCHEN_FINAL_BODY =
  'Ask us anything about how we cook, or look at the plans if you already know what you need. Browsing and messaging never need an account.'
export const KITCHEN_FINAL_PRIMARY = WHATSAPP_CTA_LABEL
export const KITCHEN_FINAL_SECONDARY = 'Browse the plans'
