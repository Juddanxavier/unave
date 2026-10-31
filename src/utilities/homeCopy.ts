/**
 * Every fixed string on the homepage (design.md §10.1). Kept in one module, the
 * same way `planShopCopy` holds the plan pages, so the sections, the metadata and
 * the structured data cannot drift apart.
 *
 * Voice rules live in design.md §11: plain, warm, specific, no medical or result
 * promises, verbs on buttons.
 *
 * Anything marked with an em dash (—) is a placeholder awaiting a real number from
 * the business. Search this file for `—` before launch.
 */

export const HOME_TITLE = 'UNAVE | Healthy food subscriptions, delivered monthly'
export const HOME_DESCRIPTION =
  'Healthy, nutrition-conscious and diabetes-conscious meals cooked fresh and delivered monthly. Pick a plan, check out as a guest, and manage it from a private link.'

/** Where the calls to action point. Only pages that exist today. */
export const HOME_HREF_PLANS = '/plans'
export const HOME_HREF_HOW_IT_WORKS = '#how-it-works'
export const HOME_HREF_FAQ = '#faq'

/**
 * Placeholder photography: free-licence stock, already cropped and compressed to
 * the sizes these slots use. design.md §8 describes the real shoot; swap these
 * files (same names, same paths) when it lands and nothing else has to change.
 */
export const IMAGES = {
  /** A full day of meals, photographed from above. Sits behind the hero. */
  heroBg: '/images/hero-table.jpg',
  /** Our kitchen, mid-service. */
  kitchen: '/images/kitchen.jpg',
  /** A plated meal on a dark surface. Sits behind the closing band. */
  ctaBg: '/images/band-cta.jpg',
} as const

/** 1. Announcement bar now lives in the site chrome (Header global), above the navbar. */

/** 2. Hero */
export const HERO_EYEBROW = 'Cloud kitchen · Monthly food subscriptions'
export const HERO_HEADLINE = 'Good food, planned for'
export const HERO_HEADLINE_ACCENT = 'your whole month.'
export const HERO_SUB =
  'Healthy, nutrition-conscious and diabetes-conscious meals, cooked in our kitchen and delivered to your door.'
export const HERO_PRIMARY = 'See Subscription Plans'
export const HERO_SECONDARY = 'How It Works'
/** Placeholder: confirm the entry price before launch. */
export const HERO_PRICE_LEAD = 'Plans from'
export const HERO_PRICE_VALUE = '—'
export const HERO_PRICE_UNIT = 'per meal'

/** Feature chips under the hero buttons. `icon` is resolved in Hero.tsx. */
export const HERO_CHIPS = [
  { label: 'Fresh daily', icon: 'leaf' },
  { label: 'Weekly or monthly', icon: 'calendar' },
  { label: 'Pause any time', icon: 'pause' },
  { label: 'No password, ever', icon: 'lock' },
] as const

/** 3. Trust strip. Every claim here has to survive a question. */
export const TRUST = [
  {
    label: 'Secure payment',
    note: 'Paid on a secure page',
    icon: 'shield',
  },
  {
    label: 'Delivered to your door',
    /** Placeholder: list the areas we actually reach. */
    note: 'Areas: —',
    icon: 'truck',
  },
  {
    label: 'Weekly or monthly',
    note: 'Change your plan any time',
    icon: 'calendar',
  },
  {
    label: 'Pause it yourself',
    note: 'No phone call needed',
    icon: 'pause',
  },
  {
    label: 'Home-style cooking',
    note: 'Cooked in our own kitchen',
    icon: 'utensils',
  },
  {
    label: 'FSSAI licensed',
    /** Placeholder: the licence number. */
    note: 'No. —',
    icon: 'badge',
  },
] as const

/** 4. Welcome */
export const WELCOME_HEADING = 'Welcome to UNAVE'
export const WELCOME_BODY = [
  'We are a cloud kitchen that cooks one kind of food: healthy, home-style meals, planned for the whole month so the daily question of what to eat is already answered.',
  'You pick a plan and a start date. We cook, pack and deliver on schedule. You can read or change your subscription any time from a private link we email you, with no app to install and no password to remember.',
]
export const WELCOME_PHOTO = 'Our kitchen, mid-service'

/** 5. What makes us different. Numbered 01–06 on the page. */
export const BENEFITS_HEADING = 'What makes us different'
export const BENEFITS = [
  {
    title: 'One kitchen, one focus',
    body: 'We cook healthy food only. Nothing else competes for the kitchen’s attention.',
  },
  {
    title: 'Order as a guest, sign in if you like',
    body: 'Check out without an account. Your subscription lives behind a private link we email you, and you can sign in with Google whenever you want every plan in one place.',
  },
  {
    title: 'You can pause it yourself',
    body: 'Pause or cancel from that link, without calling anyone or waiting for a reply.',
  },
  {
    title: 'Weekly or monthly',
    body: 'Start with one meal a day or take the whole day, for a week or for a month.',
  },
  {
    title: 'Prices before you pay',
    body: 'Every plan shows its meals, its price and its delivery details up front.',
  },
  {
    title: 'Cooked, not assembled',
    body: 'Meals are cooked in our kitchen, in batches we can actually control.',
  },
] as const

/** 6. Plans and prices */
export const PRICING_HEADING = 'Plans and prices'
export const PRICING_INTRO =
  'Choose how long you want to eat with us. Every plan covers one meal a day.'
export const PRICING_TIERS = [
  {
    name: 'Trial',
    tagline: 'One week to try us',
    /** Placeholder: meals per week. */
    meals: 'Meals per week: —',
    /** Placeholder: price. */
    price: '—',
    unit: 'per meal',
    perks: ['One week, no commitment', 'Breakfast, lunch or dinner', 'Cancel from your link'],
    cta: 'Start with a trial',
    highlight: false,
  },
  {
    name: 'Weekly',
    tagline: 'The usual way to start',
    meals: 'Meals per week: —',
    price: '—',
    unit: 'per meal',
    perks: ['Choose your meals per week', 'Pause any time', 'Full-day option available'],
    cta: 'See weekly plans',
    highlight: true,
    ribbon: 'Most popular',
  },
  {
    name: 'Monthly',
    tagline: 'For people who are settled',
    meals: 'Meals per week: —',
    price: '—',
    unit: 'per meal',
    perks: ['Everything in Weekly', 'Planned a month ahead', 'Best price per meal'],
    cta: 'See monthly plans',
    highlight: false,
  },
] as const
/** The other axis: which meals. Shown as a compact row under the tiers. */
export const PRICING_MEALS_HEADING = 'Then choose your meals'
export const PRICING_MEALS = [
  { name: 'Full-day', slots: 'Breakfast, lunch and dinner', icon: 'all' },
  { name: 'Breakfast', slots: 'Mornings', icon: 'breakfast' },
  { name: 'Lunch', slots: 'Midday', icon: 'lunch' },
  { name: 'Dinner', slots: 'Evenings', icon: 'dinner' },
] as const
export const PRICING_MEALS_NOTE = 'Mix any meal option with any plan length.'
export const PRICING_NOTE =
  'Real prices and delivery areas are shown on each plan page before you pay.'
/** Placeholder marker. Delete this line once the numbers above are real. */
export const PRICING_PLACEHOLDER =
  'Prices and meal counts marked — are placeholders, to be confirmed before launch.'

/** 7. What we cook */
export const CATEGORIES_HEADING = 'What we cook'
export const CATEGORIES_INTRO =
  'Four kinds of food, one kitchen. Every meal is cooked the day it is sent out.'
export const CATEGORIES = [
  {
    name: 'Healthy food',
    description:
      'Balanced everyday meals cooked the way you would at home. Fresh vegetables, dal, rice, rotis and millets.',
    accent: 'healthy',
    image: '/images/category-healthy.jpg',
  },
  {
    name: 'Nutrition food',
    description:
      'Built around protein, fibre and whole grains, for people who read labels and want their plate to earn its place.',
    accent: 'nutrition',
    image: '/images/category-nutrition.jpg',
  },
  {
    name: 'Diet food',
    description:
      'Lighter portions and simple cooking, without cutting the flavour down to nothing. Sensible, not punishing.',
    accent: 'diet',
    image: '/images/category-diet.jpg',
  },
  {
    name: 'Diabetes-conscious',
    description:
      'No added sugar, controlled portions and slow-release grains, cooked to a routine you can rely on.',
    note: 'Food option, not medical advice.',
    accent: 'diabetes',
    image: '/images/category-diabetes.jpg',
  },
] as const

/** The notice block required wherever a medical or dietary claim is made (design.md §6.11). */
export const NOTICE_TITLE = 'A note on your goals'
export const NOTICE_BODY =
  'We cook healthy food and we describe it honestly. We do not promise weight loss, muscle gain or any medical outcome, and our meals are not a substitute for advice from your doctor or a qualified nutritionist. If you are managing a condition, please talk to them about your plan.'

/** 7b. From our kitchen. Placeholder photography, captions only, no claims. */
export const GALLERY_HEADING = 'From our kitchen'
export const GALLERY_INTRO =
  'A look at what leaves the kitchen: cooked the same morning, portioned, and packed to travel.'
export const GALLERY = [
  { image: '/images/gallery-1.jpg', caption: 'Morning prep, before the first delivery' },
  { image: '/images/gallery-2.jpg', caption: 'Cooked in batches we can actually control' },
  { image: '/images/gallery-3.jpg', caption: 'Portioned for one sitting, nothing wasted' },
] as const

/** 8. How it works */
export const STEPS_HEADING = 'How it works'
export const STEPS = [
  { title: 'Browse the menu', body: 'See what we cook this month and what each plan includes.' },
  { title: 'Pick a plan', body: 'Breakfast, lunch, dinner, or all three. Weekly or monthly.' },
  { title: 'Share your details', body: 'Name, phone, email and delivery address. That is all.' },
  { title: 'Pay securely', body: 'You pay through our payment partner on a secure page.' },
  { title: 'Get your confirmation', body: 'We email your order summary and a private link.' },
  { title: 'Enjoy your meals', body: 'We cook and deliver on the schedule you chose.' },
] as const

/** 9. Plan access band */
export const PLAN_ACCESS_HEADING = 'Your plan, always in reach'
export const PLAN_ACCESS_BODY =
  'Every plan comes with a private link we email you. Open it any time to see your plan, your dates and your payment status, or to cancel. No password, and no account required.'
export const PLAN_ACCESS_ACCOUNT =
  'Prefer one place for everything? Sign in with Google when you want to.'
export const PLAN_ACCESS_REASSURANCE =
  'Just opening the link never changes anything. You always get to confirm first.'

/** 10. Customer words. Placeholders until real, attributed quotes arrive. */
export const TESTIMONIALS_HEADING = 'What customers say'
export const TESTIMONIALS = [
  { quote: '[Customer quote goes here]', name: '[Customer name]', plan: '[Plan]' },
  { quote: '[Customer quote goes here]', name: '[Customer name]', plan: '[Plan]' },
  { quote: '[Customer quote goes here]', name: '[Customer name]', plan: '[Plan]' },
] as const
export const TESTIMONIALS_PLACEHOLDER =
  'Placeholder quotes. Real, attributed customer words only, and no health outcomes.'

/** 11. Common questions */
export const FAQ_HEADING = 'Common questions'
export const FAQ = [
  {
    question: 'What does a plan include?',
    answer:
      'Every plan shows how many meals a week it covers, what is included and what it costs before you pay. You can compare all of them side by side on the plans page.',
  },
  {
    question: 'When and where do you deliver?',
    answer:
      'We deliver to the schedule attached to your plan. When you enter your address at checkout we confirm whether we reach you, and we tell you before you pay if we do not.',
  },
  {
    question: 'Can I pause or cancel?',
    answer:
      'Yes, from the private link in your email. Nothing changes until you confirm it, so opening the link never commits you to anything.',
  },
  {
    question: 'How do I pay?',
    answer:
      'You pay online at checkout through our payment partner. We never see or store your card details.',
  },
  {
    question: 'I have allergies or a health condition. Can I order?',
    answer:
      'Tell us in the allergy field at checkout and we will tell you honestly what we can and cannot do. Our meals are food options and are not a substitute for medical or nutritional advice.',
  },
] as const

/** 12. Final call to action */
export const FINAL_HEADING = 'Start with one month'
export const FINAL_BODY =
  'Pick a plan today and your first delivery is planned before the week is out.'
export const FINAL_PRIMARY = 'Start My Subscription'
export const FINAL_SECONDARY = 'Common Questions'
