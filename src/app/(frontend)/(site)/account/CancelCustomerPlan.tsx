'use client'

import { Loader2 } from 'lucide-react'
import React, { useActionState, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  ACCOUNT_CANCEL_CONFIRM,
  ACCOUNT_CANCEL_FINAL,
  ACCOUNT_CANCEL_KEEP,
  ACCOUNT_CANCEL_OPEN,
  ACCOUNT_CANCEL_PANEL_HEADING,
  ACCOUNT_CANCEL_REASON_LABEL,
  ACCOUNT_CANCELLED,
  ACCOUNT_SESSION_EXPIRED,
} from './copy'
import { cancelCustomerPlan, type CancelCustomerPlanState } from './actions'

const INITIAL: CancelCustomerPlanState = { status: 'idle' }

/**
 * Cancel control for one plan on the account page.
 *
 * Focus moves to the panel heading when it opens, and the destructive button is
 * never the default focus target.
 */
export const CancelCustomerPlan: React.FC<{ subscriptionId: number | string }> = ({
  subscriptionId,
}) => {
  const [state, formAction, isPending] = useActionState(cancelCustomerPlan, INITIAL)
  const [open, setOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (open) headingRef.current?.focus()
  }, [open])

  // The session expired between rendering the page and submitting the form.
  if (state.status === 'signed-out') {
    return (
      <p className="text-ink-600 text-sm leading-6" role="alert">
        {ACCOUNT_SESSION_EXPIRED}
      </p>
    )
  }

  if (state.status === 'done') {
    return <p className="text-ink-600 text-sm leading-6">{ACCOUNT_CANCELLED}</p>
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} type="button" variant="outline">
        {ACCOUNT_CANCEL_OPEN}
      </Button>
    )
  }

  const hasError = state.status === 'error'

  return (
    <form
      action={formAction}
      className="border-line flex flex-col gap-4 rounded-lg border p-4 sm:p-6"
      noValidate
    >
      <h3
        className="rounded-sm text-lg font-semibold outline-none focus-visible:ring-4"
        ref={headingRef}
        tabIndex={-1}
      >
        {ACCOUNT_CANCEL_PANEL_HEADING}
      </h3>
      <p className="text-ink-600 text-sm leading-6">{ACCOUNT_CANCEL_CONFIRM}</p>

      {hasError ? (
        <p className="text-destructive text-sm font-medium" role="alert">
          {state.message}
        </p>
      ) : null}

      <input name="subscriptionId" type="hidden" value={String(subscriptionId)} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`cancel-reason-${subscriptionId}`}>{ACCOUNT_CANCEL_REASON_LABEL}</Label>
        <Textarea
          aria-invalid={hasError || undefined}
          aria-required="true"
          id={`cancel-reason-${subscriptionId}`}
          maxLength={500}
          name="reason"
          required
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button disabled={isPending} onClick={() => setOpen(false)} type="button" variant="outline">
          {ACCOUNT_CANCEL_KEEP}
        </Button>
        <Button disabled={isPending} type="submit" variant="destructive">
          {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {ACCOUNT_CANCEL_FINAL}
        </Button>
      </div>
    </form>
  )
}
