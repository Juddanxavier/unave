/**
 * The personal food preference a customer keeps on their profile.
 *
 * A kitchen question, not a medical one: this records what the customer prefers to
 * eat, so it sits beside their delivery details rather than anywhere near the
 * medical and allergy notice block the design system reserves for health claims.
 * Nothing here asserts anything about anyone's health.
 */

export const FOOD_PREFERENCE_VALUES = [
  'none',
  'vegetarian',
  'vegan',
  'eggetarian',
  'non-vegetarian',
] as const

export type FoodPreference = (typeof FOOD_PREFERENCE_VALUES)[number]

export const FOOD_PREFERENCE_LABELS: Record<FoodPreference, string> = {
  eggetarian: 'Eggetarian',
  'non-vegetarian': 'Non-vegetarian',
  none: 'No preference',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
}

/** In Payload's `options` shape, in the order a person would scan them. */
export const FOOD_PREFERENCES = FOOD_PREFERENCE_VALUES.map((value) => ({
  label: FOOD_PREFERENCE_LABELS[value],
  value,
}))

export const isFoodPreference = (value: unknown): value is FoodPreference =>
  typeof value === 'string' && (FOOD_PREFERENCE_VALUES as readonly string[]).includes(value)

/** Unknown or empty values read as the default, both on screen and in the admin. */
export const foodPreferenceLabel = (value: unknown): string =>
  isFoodPreference(value) ? FOOD_PREFERENCE_LABELS[value] : FOOD_PREFERENCE_LABELS.none
