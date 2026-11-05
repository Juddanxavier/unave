/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import {
  AUDIENCE_FILTER_LABEL,
  AUDIENCE_FILTER_ORDER,
  AUDIENCE_LABEL,
  CATEGORY_LABEL,
  categoryBadgeAriaLabel,
  PLANS_CATEGORY_CTA_BROWSE,
  PLANS_CATEGORY_FILTER_EMPTY_BODY,
  PLANS_CATEGORY_FILTER_EMPTY_HEADING,
  PLANS_CATEGORY_FINAL_BODY,
  PLANS_CATEGORY_FINAL_HEADING,
  PLAN_CATEGORY_COPY,
  PLAN_CATEGORY_VALUES,
  isPlanCategory,
  planCategoryHref,
} from '@/utilities/plansCategoryCopy'

/**
 * The shared source of the category pages (spec 0008).
 *
 * Every label the plan card badges show and every word the category pages
 * render comes from this one module, so the tests hold it to the whole
 * contract: exactly three route values, a href for each, labels that never
 * drift between a badge and its page, and copy that is complete for every
 * category.
 */
describe('isPlanCategory', () => {
  it('accepts exactly the three category values', () => {
    expect(isPlanCategory('ready-to-cook')).toBe(true)
    expect(isPlanCategory('ready-to-eat')).toBe(true)
    expect(isPlanCategory('fresh-from-produce')).toBe(true)
  })

  it('refuses anything else, including plan slugs and near misses', () => {
    expect(isPlanCategory('lunch-plan')).toBe(false)
    expect(isPlanCategory('kids')).toBe(false)
    expect(isPlanCategory('')).toBe(false)
    expect(isPlanCategory('READY-TO-COOK')).toBe(false)
    expect(isPlanCategory('ready-to-cook ')).toBe(false)
  })
})

describe('planCategoryHref', () => {
  it('builds the address of each category page', () => {
    expect(planCategoryHref('ready-to-cook')).toBe('/plans/ready-to-cook')
    expect(planCategoryHref('ready-to-eat')).toBe('/plans/ready-to-eat')
    expect(planCategoryHref('fresh-from-produce')).toBe('/plans/fresh-from-produce')
  })
})

describe('the route values', () => {
  it('are exactly the three select options on Plans', () => {
    expect(PLAN_CATEGORY_VALUES).toHaveLength(3)
    expect(Object.keys(CATEGORY_LABEL).sort()).toEqual([...PLAN_CATEGORY_VALUES].sort())
  })
})

describe('the label maps', () => {
  it('name every category and audience', () => {
    expect(CATEGORY_LABEL['ready-to-cook']).toBe('Ready to cook')
    expect(CATEGORY_LABEL['ready-to-eat']).toBe('Ready to eat')
    expect(CATEGORY_LABEL['fresh-from-produce']).toBe('Fresh from produce')

    expect(AUDIENCE_LABEL.kids).toBe('Kids')
    expect(AUDIENCE_LABEL.adults).toBe('Adults')
    expect(AUDIENCE_LABEL.special).toBe('Special')
  })

  it('give the filter pills All plus every audience, in order', () => {
    expect(AUDIENCE_FILTER_ORDER).toEqual(['all', 'kids', 'adults', 'special'])
    expect(AUDIENCE_FILTER_LABEL.all).toBe('All')
    expect(AUDIENCE_FILTER_LABEL.kids).toBe(AUDIENCE_LABEL.kids)
    expect(AUDIENCE_FILTER_LABEL.adults).toBe(AUDIENCE_LABEL.adults)
    expect(AUDIENCE_FILTER_LABEL.special).toBe(AUDIENCE_LABEL.special)
  })

  it('name the badge links after the category page they open', () => {
    expect(categoryBadgeAriaLabel('ready-to-cook')).toBe('Browse Ready to cook plans')
    expect(categoryBadgeAriaLabel('fresh-from-produce')).toBe('Browse Fresh from produce plans')
  })
})

describe('the per category copy', () => {
  it('is complete for every category, with nothing blank', () => {
    for (const value of PLAN_CATEGORY_VALUES) {
      const copy = PLAN_CATEGORY_COPY[value]

      expect(copy.eyebrow).toBe(CATEGORY_LABEL[value])
      expect(copy.headline.trim()).toBeTruthy()
      expect(copy.headlineAccent.trim()).toBeTruthy()
      expect(copy.intro.trim()).toBeTruthy()
      expect(copy.gridHeading.trim()).toBeTruthy()
      expect(copy.gridIntro.trim()).toBeTruthy()
      expect(copy.metaTitle.trim()).toBeTruthy()
      expect(copy.metaDescription.trim()).toBeTruthy()
    }
  })
})

describe('the shared page words', () => {
  it('carry a browse label, a closing section and both empty states', () => {
    expect(PLANS_CATEGORY_CTA_BROWSE.trim()).toBeTruthy()
    expect(PLANS_CATEGORY_FINAL_HEADING.trim()).toBeTruthy()
    expect(PLANS_CATEGORY_FINAL_BODY.trim()).toBeTruthy()
    expect(PLANS_CATEGORY_FILTER_EMPTY_HEADING.trim()).toBeTruthy()
    expect(PLANS_CATEGORY_FILTER_EMPTY_BODY.trim()).toBeTruthy()
  })
})
