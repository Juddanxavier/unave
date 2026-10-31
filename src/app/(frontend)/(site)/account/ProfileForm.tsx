'use client'

import { Loader2 } from 'lucide-react'
import React, { useActionState, useRef, useState } from 'react'

import { FoodPreferenceSelect } from '@/components/CustomerAuth/FoodPreferenceSelect'
import {
  AUTH_FIELD_ERROR,
  AUTH_INPUT,
  AUTH_INPUT_INVALID,
  AUTH_LABEL,
} from '@/components/CustomerAuth/styles'
import { Button } from '@/components/ui/button'
import { customerProfileSchema } from '@/utilities/customerProfile'
import { type FieldErrors, toFieldErrors } from '@/utilities/fieldErrors'
import { cn } from '@/utilities/ui'

import { saveCustomerProfile, type SaveCustomerProfileState } from './actions'
import {
  ACCOUNT_ADDRESS_LINE1_LABEL,
  ACCOUNT_ADDRESS_LINE2_LABEL,
  ACCOUNT_CITY_LABEL,
  ACCOUNT_FOOD_PREFERENCE_HINT,
  ACCOUNT_FOOD_PREFERENCE_LABEL,
  ACCOUNT_PHONE_LABEL,
  ACCOUNT_PINCODE_LABEL,
  ACCOUNT_PROFILE_INVALID,
  ACCOUNT_PROFILE_SAVED,
  ACCOUNT_PROFILE_SAVE,
  ACCOUNT_STATE_LABEL,
  ACCOUNT_SESSION_EXPIRED,
} from './copy'

const INITIAL: SaveCustomerProfileState = { status: 'idle' }

interface FieldProps {
  autoComplete?: string
  defaultValue?: string
  error?: string
  id: string
  inputMode?: 'numeric' | 'tel'
  label: string
  name: string
  type?: 'tel' | 'text'
}

/** One labelled input, in the same style as the auth screens' fields. */
const Field: React.FC<FieldProps> = ({
  autoComplete,
  defaultValue,
  error,
  id,
  inputMode,
  label,
  name,
  type = 'text',
}) => (
  <div className="flex flex-col gap-2">
    <label className={AUTH_LABEL} htmlFor={id}>
      {label}
    </label>
    <input
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={error ? true : undefined}
      autoComplete={autoComplete}
      className={cn(AUTH_INPUT, error && AUTH_INPUT_INVALID)}
      defaultValue={defaultValue}
      id={id}
      inputMode={inputMode}
      name={name}
      type={type}
    />
    {error ? (
      <p className={AUTH_FIELD_ERROR} id={`${id}-error`} role="alert">
        {error}
      </p>
    ) : null}
  </div>
)

export interface ProfileDefaults {
  city: string
  foodPreference: string
  line1: string
  line2: string
  phone: string
  pincode: string
  state: string
}

interface Props {
  defaults: ProfileDefaults
}

/**
 * The form that saves the customer's delivery details and food preference.
 *
 * The same Zod schema (`customerProfileSchema`) runs here in the browser and again
 * in the server action, so a rule cannot be looser on one side than the other. The
 * form stays a plain `<form>` with a server action, so it still posts without
 * JavaScript — the browser pass is a courtesy, not the gate.
 */
export const ProfileForm: React.FC<Props> = ({ defaults }) => {
  const [state, formAction, isPending] = useActionState(saveCustomerProfile, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<FieldErrors>({})

  const readValues = (): Record<string, string> =>
    formRef.current
      ? (Object.fromEntries(new FormData(formRef.current)) as Record<string, string>)
      : {}

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const result = customerProfileSchema.safeParse(readValues())

    if (!result.success) {
      event.preventDefault()
      setErrors(toFieldErrors(result.error))
      return
    }

    setErrors({})
  }

  /** Once they start fixing a field, its message belongs to the value that is gone. */
  const handleInput = (event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target
    const field =
      target instanceof HTMLInputElement || target instanceof HTMLSelectElement
        ? target.name
        : ''
    if (!field) return

    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  if (state.status === 'signed-out') {
    return (
      <p className="text-ink-600 text-sm leading-6" role="alert">
        {ACCOUNT_SESSION_EXPIRED}
      </p>
    )
  }

  /** Server messages win over the browser pass, because the server ran last. */
  const errorFor = (name: string): string | undefined =>
    (state.status === 'error' ? state.fieldErrors?.[name] : undefined) ?? errors[name]

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6"
      noValidate
      onInput={handleInput}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {state.status === 'error' ? (
        <p className="text-error text-sm font-medium" role="alert">
          {state.message ?? ACCOUNT_PROFILE_INVALID}
        </p>
      ) : null}

      {state.status === 'done' ? (
        <p className="text-green-800 text-sm font-medium" role="status">
          {ACCOUNT_PROFILE_SAVED}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          autoComplete="tel"
          defaultValue={defaults.phone}
          error={errorFor('phone')}
          id="profile-phone"
          inputMode="tel"
          label={ACCOUNT_PHONE_LABEL}
          name="phone"
          type="tel"
        />

        <FoodPreferenceSelect
          defaultValue={defaults.foodPreference}
          error={errorFor('foodPreference')}
          hint={ACCOUNT_FOOD_PREFERENCE_HINT}
          id="profile-food-preference"
          label={ACCOUNT_FOOD_PREFERENCE_LABEL}
        />

        <Field
          autoComplete="address-line1"
          defaultValue={defaults.line1}
          error={errorFor('line1')}
          id="profile-line1"
          label={ACCOUNT_ADDRESS_LINE1_LABEL}
          name="line1"
        />

        <Field
          autoComplete="address-line2"
          defaultValue={defaults.line2}
          error={errorFor('line2')}
          id="profile-line2"
          label={ACCOUNT_ADDRESS_LINE2_LABEL}
          name="line2"
        />

        <Field
          autoComplete="address-level2"
          defaultValue={defaults.city}
          error={errorFor('city')}
          id="profile-city"
          label={ACCOUNT_CITY_LABEL}
          name="city"
        />

        <Field
          autoComplete="address-level1"
          defaultValue={defaults.state}
          error={errorFor('state')}
          id="profile-state"
          label={ACCOUNT_STATE_LABEL}
          name="state"
        />

        <Field
          autoComplete="postal-code"
          defaultValue={defaults.pincode}
          error={errorFor('pincode')}
          id="profile-pincode"
          inputMode="numeric"
          label={ACCOUNT_PINCODE_LABEL}
          name="pincode"
        />
      </div>

      <div>
        <Button disabled={isPending} type="submit">
          {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {ACCOUNT_PROFILE_SAVE}
        </Button>
      </div>
    </form>
  )
}