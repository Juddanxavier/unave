'use client'

import { Eye, EyeOff, Lock } from 'lucide-react'
import React, { useState } from 'react'

import { cn } from '@/utilities/ui'

import { CUSTOMER_AUTH_HIDE_PASSWORD, CUSTOMER_AUTH_SHOW_PASSWORD } from './copy'
import {
  AUTH_FIELD_ERROR,
  AUTH_INPUT,
  AUTH_INPUT_INVALID,
  AUTH_INPUT_TRAILING,
  AUTH_LABEL,
} from './styles'

interface Props {
  /** A quiet link opposite the label, such as Forgot your password?. */
  action?: React.ReactNode
  autoComplete: 'current-password' | 'new-password'
  error?: string
  hint?: string
  id: string
  label: string
  name: string
}

/**
 * The password input, with the one control every password field should have.
 *
 * The toggle is a real button with `aria-pressed` and a label that changes with the
 * state, so it is usable from the keyboard and readable to a screen reader. It only
 * swaps the input's `type`; the value is never read, copied or logged here.
 */
export const PasswordField: React.FC<Props> = ({
  action,
  autoComplete,
  error,
  hint,
  id,
  label,
  name,
}) => {
  const [visible, setVisible] = useState(false)

  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label className={AUTH_LABEL} htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <Lock
          aria-hidden="true"
          className="text-ink-400 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className={cn(AUTH_INPUT, AUTH_INPUT_TRAILING, error && AUTH_INPUT_INVALID)}
          id={id}
          name={name}
          required
          type={visible ? 'text' : 'password'}
        />
        <button
          aria-label={visible ? CUSTOMER_AUTH_HIDE_PASSWORD : CUSTOMER_AUTH_SHOW_PASSWORD}
          aria-pressed={visible}
          className="text-ink-600 hover:bg-green-50 focus-visible:ring-green-500 rounded-pill absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-5" />
          ) : (
            <Eye aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>
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