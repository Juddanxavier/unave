import { describe, expect, it } from 'vitest'

import { computeEndDate } from '@/utilities/computeEndDate'

describe('computeEndDate', () => {
  describe('weekly plans', () => {
    it('adds seven days to the start date', () => {
      expect(computeEndDate('2026-03-01T00:00:00.000Z', 'weekly')).toBe('2026-03-08T00:00:00.000Z')
    })

    it('rolls over into the next month', () => {
      expect(computeEndDate('2026-01-29T00:00:00.000Z', 'weekly')).toBe('2026-02-05T00:00:00.000Z')
    })

    it('rolls over into the next year', () => {
      expect(computeEndDate('2026-12-29T00:00:00.000Z', 'weekly')).toBe('2027-01-05T00:00:00.000Z')
    })
  })

  describe('monthly plans', () => {
    it('lands on the same day of the next month', () => {
      expect(computeEndDate('2026-01-15T00:00:00.000Z', 'monthly')).toBe(
        '2026-02-15T00:00:00.000Z',
      )
    })

    it('clamps 31 January to 28 February in a common year', () => {
      expect(computeEndDate('2026-01-31T00:00:00.000Z', 'monthly')).toBe(
        '2026-02-28T00:00:00.000Z',
      )
    })

    it('clamps 31 January to 29 February in a leap year', () => {
      expect(computeEndDate('2024-01-31T00:00:00.000Z', 'monthly')).toBe(
        '2024-02-29T00:00:00.000Z',
      )
    })

    it('clamps 31 August to 30 September', () => {
      expect(computeEndDate('2026-08-31T00:00:00.000Z', 'monthly')).toBe(
        '2026-09-30T00:00:00.000Z',
      )
    })

    it('rolls 31 December over to 31 January of the next year', () => {
      expect(computeEndDate('2026-12-31T00:00:00.000Z', 'monthly')).toBe(
        '2027-01-31T00:00:00.000Z',
      )
    })
  })

  it('strips the time of day and returns UTC midnight', () => {
    expect(computeEndDate('2026-01-31T18:45:12.345Z', 'monthly')).toBe(
      '2026-02-28T00:00:00.000Z',
    )
  })

  it('treats a date near midnight as the same calendar day', () => {
    expect(computeEndDate('2026-05-10T23:59:59.999Z', 'weekly')).toBe(
      '2026-05-17T00:00:00.000Z',
    )
  })
})
