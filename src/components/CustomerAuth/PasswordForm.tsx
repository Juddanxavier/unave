'use client'

import React, { useRef, useState } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import {
  type CustomerAuthIntent,
  type FieldErrors,
  customerAuthSchemas,
  toFieldErrors,
} from '@/auth/password/schema'
import { cn } from '@/utilities/ui'

import { PasswordField } from './PasswordField'
import { AuthField } from './fields'
import { CUSTOMER_AUTH_EMAIL_LABEL, CUSTOMER_AUTH_PASSWORD_HINT } from './copy'

interface PasswordSpec {
  /** A quiet link opposite the label, such as Forgot your password?. */
  action?: React.ReactNode
  autoComplete: 'current-password' | 'new-password'
  /**
   * `undefined` keeps the default hint and `null` removes it. A sign-in form wants
   * no hint: someone who already has a password does not need to be told how long a
   * new one has to be.
   */
  hint?: string | null
  label: string
}

interface Props {
  /**
   * The Payload endpoint this form posts to. A plain HTML form, so it posts and
   * redirects without JavaScript, and the endpoint answers with the same `?error=`
   * codes the Google half already uses.
   */
  action: string
  /** Hidden fields, used by the reset form to carry its token back. */
  children?: React.ReactNode
  emailField?: boolean
  idPrefix: string
  /** Which rule set the browser applies before it lets the form post. */
  intent: CustomerAuthIntent
  /** `false` for the forgot-password card, which asks only for an address. */
  password?: PasswordSpec | false
  submit: string
}

/**
 * The password form shared by all four account screens.
 *
 * Validation is Zod, and it is the same schema the endpoint runs (`customerAuthSchemas`
 * from `src/auth/password/schema.ts`). The form is marked `noValidate`, which is the
 * important line: without it the browser's own `required` and `type="email"` checks
 * fire first and stop the `submit` event before this code runs, so the browser's
 * message shows and Zod's never does. `noValidate` only turns off that built-in
 * layer — the attributes stay on the inputs for autofill and semantics, and the
 * endpoint is still the real gate.
 *
 * It remains a normal HTML form, so with JavaScript off it posts and the endpoint
 * answers with a `?error=` line. With JavaScript on, a mistake is reported against
 * the field it belongs to, on blur and on submit, instead of costing a round trip.
 */
export const PasswordForm: React.FC<Props> = ({
  action,
  children,
  emailField = false,
  idPrefix,
  intent,
  password = {
    autoComplete: 'current-password',
    label: 'Password',
  },
  submit,
}) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<FieldErrors>({})

  const readValues = (): Record<string, string> =>
    formRef.current
      ? (Object.fromEntries(new FormData(formRef.current)) as Record<string, string>)
      : {}

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const result = customerAuthSchemas[intent].safeParse(readValues())

    if (!result.success) {
      event.preventDefault()
      setErrors(toFieldErrors(result.error))
      return
    }

    setErrors({})
  }

  /**
   * Check one field when it loses focus, keeping the other messages as they were, so
   * someone who tabs past the password is told about it before they press the button.
   */
  const handleBlur = (event: React.FocusEvent<HTMLFormElement>) => {
    const field = event.target instanceof HTMLInputElement ? event.target.name : ''
    if (!field) return

    const result = customerAuthSchemas[intent].safeParse(readValues())
    const found = result.success ? {} : toFieldErrors(result.error)

    setErrors((current) => {
      const next = { ...current }
      if (found[field]) next[field] = found[field]
      else delete next[field]
      return next
    })
  }

  /** Once they start fixing it, the message belongs to the value that is gone. */
  const handleInput = (event: React.FormEvent<HTMLFormElement>) => {
    const field = event.target instanceof HTMLInputElement ? event.target.name : ''
    if (!field) return
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 short:gap-2 shorter:gap-1.5"
      method="post"
      noValidate
      onBlur={handleBlur}
      onInput={handleInput}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {emailField ? (
        <AuthField
          autoComplete="email"
          error={errors.email}
          id={`${idPrefix}-email`}
          label={CUSTOMER_AUTH_EMAIL_LABEL}
          name="email"
        />
      ) : null}

      {password ? (
        <PasswordField
          action={password.action}
          autoComplete={password.autoComplete}
          error={errors.password}
          hint={
            (password.hint === undefined ? CUSTOMER_AUTH_PASSWORD_HINT : password.hint) ?? undefined
          }
          id={`${idPrefix}-password`}
          label={password.label}
          name="password"
        />
      ) : null}

      {children}

      <button className={cn(CTA_BASE, CTA_VARIANTS.primary, 'mt-2 short:mt-1 w-full')} type="submit">
        {submit}
      </button>
    </form>
  )
}
