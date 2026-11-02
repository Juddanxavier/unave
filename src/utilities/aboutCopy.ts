/**
 * Every fixed string the about page shows (spec 0006). Kept in one module so the
 * page and any future reuse cannot drift, like homeCopy and contactCopy.
 */

import { WHATSAPP_CTA_LABEL } from '@/utilities/whatsapp'

export const ABOUT_PAGE_TITLE = 'About us'
export const ABOUT_PAGE_DESCRIPTION =
  'Who cooks UNAVE meals, how the kitchen works, and what we promise and do not promise.'

export const ABOUT_HERO_EYEBROW = 'Our kitchen'
export const ABOUT_HERO_HEADLINE = 'Food from a kitchen,'
export const ABOUT_HERO_HEADLINE_ACCENT = 'not a factory'
export const ABOUT_HERO_SUB =
  'UNAVE cooks the way a careful home does: fresh every morning, honest about what goes in, and delivered when we say it will be.'
export const ABOUT_HERO_CTA = WHATSAPP_CTA_LABEL

/** Photography (design.md §8): the band photos are decorative; the story photo is content. */
export const ABOUT_IMAGES = {
  hero: '/images/kitchen.jpg',
  story: '/images/gallery-1.jpg',
} as const

export const ABOUT_STORY_IMAGE_ALT =
  'Morning prep in the UNAVE kitchen, before the first delivery goes out'

export const ABOUT_STORY_HEADING = 'Why we started UNAVE'
export const ABOUT_STORY_PARAGRAPHS = [
  'UNAVE started with family. We were cooking for parents who wanted lighter, diabetes-conscious meals and for children who needed food that actually gets eaten, and we kept hearing the same thing: it is easier to order something than to cook like this every day.',
  'So we turned our kitchen professional without changing how it cooks. The same recipes, the same small batches, the same care about oil and salt — now with a schedule, a menu that changes through the week, and a delivery you can plan your day around.',
  'We are a small team, and we like it that way. When you write to us, the person who answers is the person who cooks.',
] as const

export const ABOUT_VALUES_HEADING = 'What we stand for'
export const ABOUT_VALUES_INTRO =
  'Four things we will not trade away, whatever the day looks like.'
export const ABOUT_VALUES = [
  {
    text: 'Nothing sits from yesterday. The menu is cooked the day it is delivered, in batches small enough to watch.',
    title: 'Fresh every morning',
  },
  {
    text: 'The menu says what is in a dish and what is not. If a dish is lighter on oil, that is why — not a slogan.',
    title: 'Honest ingredients',
  },
  {
    text: 'The same pots, the same recipes we cook for our own families. No assembly line, no reheated trays.',
    title: 'Cooked like home',
  },
  {
    text: 'You tell us what fits your week, and we hold up our end of it. Change your mind, and the week changes with you.',
    title: 'On your schedule',
  },
] as const

export const ABOUT_WORK_HEADING = 'How it works here'
export const ABOUT_WORK = [
  {
    text: 'Browse the menu freely — no account needed to look, and none needed to get in touch.',
    title: 'Choose what fits',
  },
  {
    text: 'Tell us your food preference — vegetarian, vegan, or anything else — and the kitchen plans your week around it.',
    title: 'Tell us how you eat',
  },
  {
    text: 'Message us on WhatsApp or from the contact page. A person who cooks here reads it and answers.',
    title: 'Talk to a person',
  },
] as const

export const ABOUT_NOTICE_TITLE = 'A note on your goals'
export const ABOUT_NOTICE_BODY =
  'Our meals are food options, not medical or nutritional advice. If you cook around diabetes, allergies or anything else, please talk to your doctor or a qualified dietitian — we are glad to work with whatever they advise.'

export const ABOUT_FINAL_HEADING = 'Come and eat with us'
export const ABOUT_FINAL_BODY =
  'Tell us what you need, or simply ask us a question. Both are welcome, and neither needs an account.'
export const ABOUT_FINAL_PRIMARY = WHATSAPP_CTA_LABEL
export const ABOUT_FINAL_SECONDARY = 'Message us'
