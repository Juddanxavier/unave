import Link from 'next/link'
import React from 'react'

import { CTA_BASE, CTA_VARIANTS, Cta } from '@/components/Cta'
import { cn } from '@/utilities/ui'
import { isCustomerSignInConfigured } from '@/utilities/customerSession'

import { AuthShell } from './AuthShell'
import { FoodPreferenceSelect } from './FoodPreferenceSelect'
import { PasswordForm } from './PasswordForm'
import { AuthField } from './fields'
import { GoogleIcon } from './icons'
import { AUTH_INLINE_LINK, AUTH_NOTICE, AUTH_PROBLEM } from './styles'
import {
  CUSTOMER_AUTH_CHOOSE_PASSWORD,
  CUSTOMER_AUTH_COPY,
  CUSTOMER_AUTH_CTA,
  CUSTOMER_AUTH_DIVIDER,
  CUSTOMER_AUTH_EMAIL_LABEL,
  CUSTOMER_AUTH_FOOD_PREFERENCE_HINT,
  CUSTOMER_AUTH_FOOD_PREFERENCE_LABEL,
  CUSTOMER_AUTH_FORGOT,
  CUSTOMER_AUTH_PASSWORD_LABEL,
  CUSTOMER_AUTH_PRIVACY,
  CUSTOMER_AUTH_RESEND,
  CUSTOMER_AUTH_UNAVAILABLE,
  customerAuthError,
  customerAuthNotice,
  type CustomerAuthMode,
} from './copy'

interface Props {
  /** Plain code from `?error=`, or undefined on a clean visit. */
  error?: string
  mode: CustomerAuthMode
  /** Plain code from `?registered=`, `?resent=` or `?verified=`. */
  notice?: string
  /** A checked path from `?return=`, carried through the password sign in. */
  returnTo?: string | null
}

/**
 * design.md §6.13: a utility screen, not a campaign page.
 *
 * The password form is the primary action and Google sits under the divider as a
 * secondary one, because the form is the path every visitor can take and the Google
 * button is a shortcut that needs an account they may not have. Two primary buttons
 * in one card would leave neither of them meaning much.
 *
 * Sign in and sign up differ only in copy: the same card, the same fields, the same
 * one primary action.
 */
export const CustomerAuth: React.FC<Props> = ({ error, mode, notice, returnTo }) => {
  const copy = CUSTOMER_AUTH_COPY[mode]
  const message = customerAuthError(error)
  const confirmation = customerAuthNotice(notice)
  const configured = isCustomerSignInConfigured()

  return (
    <AuthShell>
      <h1 className="text-h2">{copy.title}</h1>
      <p className="text-body text-ink-600 mt-3 short:mt-2 short:text-sm">{copy.intro}</p>

      {confirmation ? (
        <p className={cn(AUTH_NOTICE, 'mt-6 short:mt-4')} role="status">
          {confirmation}
        </p>
      ) : null}

      {message ? (
        <p className={cn(AUTH_PROBLEM, 'mt-6 short:mt-4')} role="alert">
          {message}
        </p>
      ) : null}

      {error === 'unverified' ? (
        <form
          action="/api/customers/resend-verification"
          className="mt-6 short:mt-4 flex flex-col gap-4 short:gap-2"
          method="post"
        >
          <AuthField
            autoComplete="email"
            id="resend-email"
            label={CUSTOMER_AUTH_EMAIL_LABEL}
            name="email"
          />
          <button className={cn(CTA_BASE, CTA_VARIANTS.secondary, 'w-full')} type="submit">
            {CUSTOMER_AUTH_RESEND}
          </button>
        </form>
      ) : null}

      <div className="my-8 short:my-3">
        <PasswordForm
          action="/api/customers/login"
          emailField
          idPrefix={mode === 'sign-up' ? 'signup' : 'signin'}
          intent={mode}
          password={{
            action:
              mode === 'sign-in' ? (
                <Link className={cn(AUTH_INLINE_LINK, 'text-sm')} href="/forgot-password">
                  {CUSTOMER_AUTH_FORGOT}
                </Link>
              ) : undefined,
            autoComplete: mode === 'sign-up' ? 'new-password' : 'current-password',
            hint: mode === 'sign-up' ? undefined : null,
            label:
              mode === 'sign-up' ? CUSTOMER_AUTH_CHOOSE_PASSWORD : CUSTOMER_AUTH_PASSWORD_LABEL,
          }}
          submit={copy.submit}
        >
          {mode === 'sign-up' ? (
            <FoodPreferenceSelect
              hint={CUSTOMER_AUTH_FOOD_PREFERENCE_HINT}
              id="signup-food-preference"
              label={CUSTOMER_AUTH_FOOD_PREFERENCE_LABEL}
            />
          ) : null}
          {mode === 'sign-in' && returnTo ? (
            <input name="return" type="hidden" value={returnTo} />
          ) : null}
        </PasswordForm>
      </div>

      {configured ? (
        <>
          <div className="my-7 flex items-center gap-3 short:my-4">
            <span className="bg-line h-px flex-1" />
            <span className="text-ink-600 text-sm">{CUSTOMER_AUTH_DIVIDER}</span>
            <span className="bg-line h-px flex-1" />
          </div>

          <Cta
            className="w-full"
            href={
              returnTo
                ? `/api/customers/oauth/google?return=${encodeURIComponent(returnTo)}`
                : '/api/customers/oauth/google'
            }
            variant="secondary"
          >
            <GoogleIcon />
            {CUSTOMER_AUTH_CTA}
          </Cta>
        </>
      ) : (
        <p className="text-ink-600 mt-4 text-sm leading-6 short:mt-3">{CUSTOMER_AUTH_UNAVAILABLE}</p>
      )}

      <p className="text-ink-600 border-line mt-6 border-t pt-4 text-sm leading-6 short:mt-4 short:pt-3">
        {CUSTOMER_AUTH_PRIVACY}
      </p>

      <p className="text-body text-ink-600 mt-4 short:mt-2">
        {copy.switchPrompt}{' '}
        <Link className={AUTH_INLINE_LINK} href={copy.switchHref}>
          {copy.switchLabel}
        </Link>
      </p>
    </AuthShell>
  )
}