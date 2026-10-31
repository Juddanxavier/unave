import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

import { AuthShell } from './AuthShell'
import { PasswordForm } from './PasswordForm'
import { FORGOT_COPY, customerAuthError, customerAuthNotice } from './copy'
import { AUTH_INLINE_LINK, AUTH_NOTICE, AUTH_PROBLEM } from './styles'

interface Props {
  error?: string
  /** Set by `?sent=1`, which the endpoint returns whatever it decided to do. */
  sent?: string
}

/**
 * The forgot-password card.
 *
 * It asks for one thing and reports one thing. Whether the address is known, and
 * whether mail is working, the page says the same: check the inbox. Anything else
 * would turn a password form into a way to find out who has an account here.
 */
export const ForgotPassword: React.FC<Props> = ({ error, sent }) => {
  const message = customerAuthError(error)
  const confirmation = customerAuthNotice(sent ? 'sent' : undefined)

  return (
    <AuthShell>
      <h1 className="text-h2 short:text-h3">{FORGOT_COPY.title}</h1>
      <p className="text-body text-ink-600 mt-3 short:mt-2 short:text-sm">{FORGOT_COPY.intro}</p>

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

      <div className="mt-8 short:mt-4">
        <PasswordForm
          action="/api/customers/forgot-password"
          emailField
          idPrefix="forgot"
          intent="forgot"
          password={false}
          submit={FORGOT_COPY.submit}
        />
      </div>

      <p className="text-body text-ink-600 mt-6 short:mt-3">
        Remembered it?{' '}
        <Link className={AUTH_INLINE_LINK} href="/sign-in">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}