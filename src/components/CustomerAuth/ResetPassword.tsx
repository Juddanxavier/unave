import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

import { AuthShell } from './AuthShell'
import { PasswordForm } from './PasswordForm'
import {
  CUSTOMER_AUTH_NEW_PASSWORD_LABEL,
  RESET_COPY,
  customerAuthError,
  customerAuthNotice,
} from './copy'
import { AUTH_INLINE_LINK, AUTH_NOTICE, AUTH_PROBLEM } from './styles'

interface Props {
  error?: string
  /** A confirmation, shown after a successful sign-in elsewhere. Unused here yet. */
  notice?: string
  /** The one time token from the emailed link. */
  token?: string
}

/**
 * The reset-password card, reached only from the link in a reset email.
 *
 * The token travels in the query string and is posted back as a hidden field, so a
 * failure can offer the form again without asking anyone to go back to their inbox
 * for a link they already opened. Without one it does not draw a password field at
 * all, because there would be nothing to post it against.
 */
export const ResetPassword: React.FC<Props> = ({ error, notice, token }) => {
  const message = customerAuthError(error)
  const confirmation = customerAuthNotice(notice)

  return (
    <AuthShell>
      <h1 className="text-h2 short:text-h3">{RESET_COPY.title}</h1>
      <p className="text-body text-ink-600 mt-3 short:mt-2 short:text-sm">{RESET_COPY.intro}</p>

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

      {token ? (
        <div className="mt-8 short:mt-4">
          <PasswordForm
            action="/api/customers/reset-password"
            idPrefix="reset"
            intent="reset"
            password={{ autoComplete: 'new-password', label: CUSTOMER_AUTH_NEW_PASSWORD_LABEL }}
            submit={RESET_COPY.submit}
          >
            <input name="token" type="hidden" value={token} />
          </PasswordForm>
        </div>
      ) : (
        <p className="text-body text-ink-600 mt-6 short:mt-3">{RESET_COPY.missingToken}</p>
      )}

      <p className="text-body text-ink-600 mt-6 short:mt-3">
        {token ? 'Link expired? ' : null}
        <Link className={AUTH_INLINE_LINK} href="/forgot-password">
          {RESET_COPY.missingTokenAction}
        </Link>
      </p>
    </AuthShell>
  )
}