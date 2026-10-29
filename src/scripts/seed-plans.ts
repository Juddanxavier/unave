import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

const payload = await getPayload({ config })

const existing = await payload.count({ collection: 'plans' })

if (existing.totalDocs > 0) {
  payload.logger.info(`Plans already exist (${existing.totalDocs}), nothing seeded.`)
  process.exit(0)
}

await payload.create({
  collection: 'plans',
  data: {
    title: 'Weekly Tiffin',
    slug: 'weekly-tiffin',
    summary: 'One week of home style meals, delivered every day.',
    billingPeriod: 'weekly',
    mealsPerWeek: 7,
    price: 999,
    highlights: [
      { text: '7 meals in one week' },
      { text: 'Freshly cooked each morning' },
      { text: 'Free delivery in the service area' },
    ],
    isActive: true,
    sortOrder: 1,
  },
})

await payload.create({
  collection: 'plans',
  data: {
    title: 'Monthly Tiffin',
    slug: 'monthly-tiffin',
    summary: 'Four weeks of meals at a better price, six meals a week.',
    billingPeriod: 'monthly',
    mealsPerWeek: 6,
    price: 3499,
    highlights: [
      { text: '24 meals across four weeks' },
      { text: 'Rotating menu, no repeats in a week' },
      { text: 'Free delivery in the service area' },
    ],
    isActive: true,
    sortOrder: 2,
  },
})

payload.logger.info('Seeded the weekly and monthly plan.')
process.exit(0)
