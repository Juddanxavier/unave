import { describe, expect, it } from 'vitest'

import { formatPlanPrice, planPeriodWord } from '../../src/utilities/planDisplay'
import { mealsLine, priceLine } from '../../src/utilities/planShopCopy'

describe('shop price lines', () => {
  it('formats the amount in whole rupees', () => {
    const price = formatPlanPrice(1299)

    expect(price).toContain('₹')
    expect(price).not.toContain('.')
    expect(price).toMatch(/1,299/)
  })

  it('reads the period as a word on a price line', () => {
    expect(planPeriodWord('weekly')).toBe('week')
    expect(planPeriodWord('monthly')).toBe('month')
    expect(planPeriodWord(null)).toBeNull()
  })

  it('builds the price line from the formatter and the word', () => {
    expect(priceLine(formatPlanPrice(1299), 'week')).toBe('₹1,299 per week')
    expect(priceLine(formatPlanPrice(1299), 'month')).toBe('₹1,299 per month')
    expect(priceLine(null, 'week')).toBeNull()
    expect(priceLine('₹1,299', null)).toBeNull()
  })

  it('pluralises the meals line', () => {
    expect(mealsLine(1)).toBe('1 meal a week')
    expect(mealsLine(5)).toBe('5 meals a week')
    expect(mealsLine(null)).toBeNull()
    expect(mealsLine(undefined)).toBeNull()
  })
})