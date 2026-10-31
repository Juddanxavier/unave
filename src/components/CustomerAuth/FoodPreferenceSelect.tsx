'use client'

import React from 'react'

import { cn } from '@/utilities/ui'
import { FOOD_PREFERENCES } from '@/utilities/foodPreference'

import { AUTH_FIELD_ERROR, AUTH_INPUT, AUTH_INPUT_INVALID, AUTH_LABEL } from './styles'

interface Props {
  defaultValue?: string
  error?: string
  hint?: string
  id: string
  label: string
  name?: string
}

/**
 * The personal food preference, as a native `<select>`.
 *
 * Native rather than the Radix select on purpose: the sign-up form posts as plain
 * HTML when JavaScript is off, and a native select is the only kind that keeps
 * working there. The styling matches the auth inputs, so the field reads as part
 * of the same form.
 */
export const FoodPreferenceSelect: React.FC<Props> = ({
  defaultValue,
  error,
  hint,
  id,
  label,
  name = 'foodPreference',
}) => {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean)

  return (
    <div className="flex flex-col gap-2">
      <label className={AUTH_LABEL} htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={describedBy.length > 0 ? describedBy.join(' ') : undefined}
        aria-invalid={error ? true : undefined}
        className={cn(AUTH_INPUT, 'px-4', error && AUTH_INPUT_INVALID)}
        defaultValue={defaultValue}
        id={id}
        name={name}
      >
        {FOOD_PREFERENCES.map(({ label: optionLabel, value }) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
      {hint ? (
        <p className="text-ink-600 text-sm leading-6" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={AUTH_FIELD_ERROR} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}