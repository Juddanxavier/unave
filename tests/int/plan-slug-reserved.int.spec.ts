/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { Plans } from '@/collections/Plans'

/**
 * The reserved slug rule on the Plans collection (spec 0008, AC-7).
 *
 * /plans/<category> is a category page, so a plan can never take a category's
 * slug. These tests call the field's own validate the way a save would, through
 * the real collection config, and hold it to both halves of the rule: the three
 * category slugs are reserved, in any casing or padding, and audience values
 * are deliberately not.
 */

const slugField = Plans.fields.find(
  (field) => 'name' in field && field.name === 'slug',
) as unknown as {
  validate: (value: unknown) => null | string | true
}

const validate = (value: unknown) => slugField.validate(value)

describe('the reserved category slugs', () => {
  it('reject each of the three category values with the admin sentence', () => {
    for (const category of ['ready-to-cook', 'ready-to-eat', 'fresh-from-produce']) {
      const result = validate(category)
      expect(typeof result).toBe('string')
      expect(result).toContain('reserved for the category pages')
    }
  })

  it('do not slip through with other casing or padding', () => {
    expect(validate('READY-TO-COOK')).toContain('reserved')
    expect(validate(' Ready-to-Cook ')).toContain('reserved')
  })
})

describe('any other slug', () => {
  it('passes, including the slugs of the real plans', () => {
    expect(validate('lunch-plan')).toBe(true)
    expect(validate('kids-plan')).toBe(true)
    expect(validate('a-brand-new-plan')).toBe(true)
  })

  it('leaves the audience values free, on purpose', () => {
    expect(validate('kids')).toBe(true)
    expect(validate('adults')).toBe(true)
    expect(validate('special')).toBe(true)
  })

  it('lets the required check own the empty cases', () => {
    expect(validate('')).toBe(true)
    expect(validate(null)).toBe(true)
    expect(validate(undefined)).toBe(true)
  })
})
