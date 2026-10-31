'use client'

import React, { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  AUTH_FIELD_ERROR,
  AUTH_INPUT,
  AUTH_INPUT_INVALID,
  AUTH_LABEL,
} from '@/components/CustomerAuth/styles'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/ui'

import {
  CART_CHECKOUT,
  CART_CHECKOUT_NOTE,
  CART_CHECKOUT_UNAVAILABLE,
  CART_CHECKOUT_DETAILS_INVALID,
  CART_PAYMENT_CLOSED,
  CART_PAYING,
  CART_PAY_SECURE_NOTE,
  CHECKOUT_ADDRESS_LINE1_LABEL,
  CHECKOUT_ADDRESS_LINE2_LABEL,
  CHECKOUT_CITY_LABEL,
  CHECKOUT_DETAILS_HEADING,
  CHECKOUT_EMAIL_LABEL,
  CHECKOUT_EMAIL_LOCKED_HINT,
  CHECKOUT_NAME_LABEL,
  CHECKOUT_PHONE_LABEL,
  CHECKOUT_PINCODE_LABEL,
  CHECKOUT_STATE_LABEL,
} from '@/utilities/planShopCopy'

import { confirmCheckout, startCheckout, type StartCheckoutState } from './actions'

/**
 * The delivery-details form and the Razorpay modal, in one file.
 *
 * The form posts to `startCheckout`, which returns the subscription id for the
 * modal. Success returns to `confirmCheckout`, which verifies the Razorpay
 * signature server-side before anything is marked paid — the browser response
 * alone is never trusted.
 */

const INITIAL: StartCheckoutState = { status: 'idle' }

type Defaults = {
  city: string
  customerName: string
  email: string
  line1: string
  line2: string
  phone: string
  pincode: string
  state: string
}

type CheckoutResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  amount?: number
  description?: string
  handler: (response: CheckoutResponse) => void
  key: string
  modal?: { ondismiss: () => void }
  name: string
  order_id: string
  prefill?: { contact?: string; email?: string; name?: string }
  theme?: { color: string }
}

type RazorpayCtor = new (options: RazorpayOptions) => { open: () => void }

declare global {
  interface Window {
    Razorpay?: RazorpayCtor
  }
}

let checkoutScript: Promise<RazorpayCtor> | null = null

const loadRazorpay = (): Promise<RazorpayCtor> => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)

  checkoutScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.onerror = () => reject(new Error('Razorpay failed to load.'))
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay)
      else reject(new Error('Razorpay failed to load.'))
    }
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.body.appendChild(script)
  })

  return checkoutScript
}

interface FieldProps {
  autoComplete?: string
  defaultValue?: string
  error?: string
  hint?: string
  id: string
  inputMode?: 'numeric' | 'tel'
  label: string
  name: string
  readOnly?: boolean
  type?: 'email' | 'tel' | 'text'
}

/** One labelled input, in the same style as the auth screens' fields. */
const Field: React.FC<FieldProps> = ({
  autoComplete,
  defaultValue,
  error,
  hint,
  id,
  inputMode,
  label,
  name,
  readOnly,
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
      className={cn(AUTH_INPUT, error && AUTH_INPUT_INVALID, readOnly && 'opacity-60')}
      defaultValue={defaultValue}
      id={id}
      inputMode={inputMode}
      name={name}
      readOnly={readOnly}
      type={type}
    />
    {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
    {error ? (
      <p className={AUTH_FIELD_ERROR} id={`${id}-error`} role="alert">
        {error}
      </p>
    ) : null}
  </div>
)

export const CheckoutForm: React.FC<{
  available: boolean
  defaults: Defaults
  emailLocked: boolean
}> = ({ available, defaults, emailLocked }) => {
  const [state, formAction, isPending] = useActionState(startCheckout, INITIAL)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const openedFor = useRef<string | null>(null)
  const router = useRouter()

  const errorFor = (name: string): string | undefined =>
    state.status === 'error' ? state.fieldErrors?.[name] : undefined

  // The action answered with a subscription: open the modal for it, once.
  useEffect(() => {
    if (state.status !== 'ready') return
    if (openedFor.current === state.checkout.orderId) return

    openedFor.current = state.checkout.orderId
    setDismissed(false)
    setConfirmError(null)

    let cancelled = false

    const open = async () => {
      try {
        const Razorpay = await loadRazorpay()

        if (cancelled) return

        new Razorpay({
          amount: state.checkout.amountPaise,
          description: state.checkout.description,
          handler: (response) => {
            setConfirming(true)
            void confirmCheckout({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }).then((result) => {
              setConfirming(false)
              if (result.ok) {
                router.push('/order-placed')
              } else {
                setConfirmError(result.message)
              }
            })
          },
          key: state.checkout.keyId,
          modal: {
            ondismiss: () => setDismissed(true),
          },
          name: 'Unave',
          order_id: state.checkout.orderId,
          prefill: {
            contact: defaults.phone || undefined,
            email: defaults.email || undefined,
            name: defaults.customerName || undefined,
          },
          theme: { color: state.checkout.themeColor },
        }).open()
      } catch {
        if (!cancelled) setConfirmError(CART_CHECKOUT_UNAVAILABLE)
      }
    }

    void open()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const busy = isPending || confirming
  const opening = state.status === 'ready' && !dismissed && !confirmError

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <h2 className="text-lg font-semibold tracking-tight">{CHECKOUT_DETAILS_HEADING}</h2>

      {state.status === 'error' ? (
        <p className="text-destructive text-sm font-medium" role="alert">
          {state.message ?? CART_CHECKOUT_DETAILS_INVALID}
        </p>
      ) : null}

      {confirmError ? (
        <p className="text-destructive text-sm font-medium" role="alert">
          {confirmError}
        </p>
      ) : null}

      {dismissed ? (
        <p className="text-muted-foreground text-sm" role="status">
          {CART_PAYMENT_CLOSED}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          autoComplete="name"
          defaultValue={defaults.customerName}
          error={errorFor('customerName')}
          id="checkout-name"
          label={CHECKOUT_NAME_LABEL}
          name="customerName"
        />

        <Field
          autoComplete="tel"
          defaultValue={defaults.phone}
          error={errorFor('phone')}
          id="checkout-phone"
          inputMode="tel"
          label={CHECKOUT_PHONE_LABEL}
          name="phone"
          type="tel"
        />

        <Field
          autoComplete="email"
          defaultValue={defaults.email}
          error={errorFor('email')}
          hint={emailLocked ? CHECKOUT_EMAIL_LOCKED_HINT : undefined}
          id="checkout-email"
          label={CHECKOUT_EMAIL_LABEL}
          name="email"
          readOnly={emailLocked}
          type="email"
        />

        <Field
          autoComplete="address-line1"
          defaultValue={defaults.line1}
          error={errorFor('line1')}
          id="checkout-line1"
          label={CHECKOUT_ADDRESS_LINE1_LABEL}
          name="line1"
        />

        <Field
          autoComplete="address-line2"
          defaultValue={defaults.line2}
          error={errorFor('line2')}
          id="checkout-line2"
          label={CHECKOUT_ADDRESS_LINE2_LABEL}
          name="line2"
        />

        <Field
          autoComplete="address-level2"
          defaultValue={defaults.city}
          error={errorFor('city')}
          id="checkout-city"
          label={CHECKOUT_CITY_LABEL}
          name="city"
        />

        <Field
          autoComplete="address-level1"
          defaultValue={defaults.state}
          error={errorFor('state')}
          id="checkout-state"
          label={CHECKOUT_STATE_LABEL}
          name="state"
        />

        <Field
          autoComplete="postal-code"
          defaultValue={defaults.pincode}
          error={errorFor('pincode')}
          id="checkout-pincode"
          inputMode="numeric"
          label={CHECKOUT_PINCODE_LABEL}
          name="pincode"
        />
      </div>

      <div className="flex flex-col gap-2 border-t pt-6">
        {available ? (
          <Button disabled={busy} size="lg" type="submit">
            {opening ? CART_PAYING : CART_CHECKOUT}
          </Button>
        ) : (
          <Button disabled size="lg" type="button">
            {CART_CHECKOUT}
          </Button>
        )}
        <p className="text-muted-foreground text-sm">{CART_CHECKOUT_NOTE}</p>
        <p className="text-muted-foreground text-xs">{CART_PAY_SECURE_NOTE}</p>
      </div>
    </form>
  )
}
