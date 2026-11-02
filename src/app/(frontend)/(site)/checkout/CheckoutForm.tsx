'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { FoodPreferenceSelect } from '@/components/CustomerAuth/FoodPreferenceSelect'
import { orderDeliverySchema } from '@/collections/Orders/schema'
import { readCreatedOrder } from '@/utilities/orderCreate'
import { toFieldErrors, type FieldErrors } from '@/auth/password/schema'
import { cn } from '@/utilities/ui'

import {
  CHECKOUT_ADDRESS_LABEL,
  CHECKOUT_ADDRESS_OPTIONAL_LABEL,
  CHECKOUT_CITY_LABEL,
  CHECKOUT_CLOSED_MESSAGE,
  CHECKOUT_CONFIRMING_MESSAGE,
  CHECKOUT_DELIVERY_HEADING,
  CHECKOUT_DELIVERY_INTRO,
  CHECKOUT_FAILED_MESSAGE,
  CHECKOUT_FOOD_LABEL,
  CHECKOUT_NAME_LABEL,
  CHECKOUT_NOTE_LABEL,
  CHECKOUT_NOTE_PLACEHOLDER,
  CHECKOUT_PAY_CTA,
  CHECKOUT_PAY_PENDING,
  CHECKOUT_PHONE_LABEL,
  CHECKOUT_PINCODE_LABEL,
  CHECKOUT_SCRIPT_FAILED_MESSAGE,
  CHECKOUT_STATE_LABEL,
} from './copy'

/**
 * The checkout form (spec 0007, AC-3 and AC-4).
 *
 * It posts the one plan slug and duration label it was given, plus the delivery
 * details, to `/api/orders/create`, then opens the Razorpay popup with what
 * comes back. The server resolves the live price, so this component never sends
 * an amount and never needs to be trusted. When the popup reports success, the
 * browser posts the returned values to `/api/orders/verify`, which writes the
 * paid order and answers its id, and the browser walks to that order page. A
 * confirmation that never arrives leaves the payment to the signed webhook and
 * shows one plain sentence instead of a page for an order that may not exist.
 *
 * The delivery rules are the same Zod schema the endpoint enforces, so a value
 * the browser accepts is a value the server accepts too.
 */

type RazorpayHandlerResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  amount: number
  currency: string
  description: string
  handler: (response: RazorpayHandlerResponse) => void
  key: string
  modal: { ondismiss: () => void }
  name: string
  order_id: string
  prefill: { email: string; name: string; phone: string }
  theme: { color: string }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

const FIELD_LABEL = 'text-ink-900 block text-sm font-medium'
const FIELD_ERROR = 'mt-1 text-sm text-red-700'
const FIELD_INPUT =
  'border-line bg-white focus:border-green-600 focus:ring-green-500 mt-1.5 block h-11 w-full rounded-lg border px-3 text-sm focus:ring-[3px] focus:outline-none'

type Status = 'idle' | 'starting' | 'paying'

export const CheckoutForm: React.FC<{
  defaults: {
    city: string
    foodPreference: string
    line1: string
    line2: string
    name: string
    phone: string
    pincode: string
    state: string
  }
  email: string
  selection: {
    durationLabel: string
    planSlug: string
  }
}> = ({ defaults, email, selection }) => {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  const readValue = (field: string): string =>
    (document.getElementById(`checkout-${field}`) as HTMLInputElement | null)?.value?.trim() ?? ''

  const readFoodPreference = (): string =>
    (document.getElementById('checkout-food-preference') as HTMLSelectElement | null)?.value ??
    'none'

  const readNote = (): string =>
    (document.getElementById('checkout-note') as HTMLTextAreaElement | null)?.value?.trim() ?? ''

  const verifyAndContinue = async (response: RazorpayHandlerResponse) => {
    let orderId: number | string | null = null

    try {
      // The server verifies the payment and writes the order here, so this is
      // where the order id comes from. A refusal or a dropped connection leaves
      // the payment to the signed webhook and shows the customer one sentence.
      const answer = await fetch('/api/orders/verify', {
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const body = (await answer.json().catch(() => null)) as
        | { orderId?: number | string }
        | null

      if (
        answer.ok &&
        body &&
        (typeof body.orderId === 'number' || typeof body.orderId === 'string')
      ) {
        orderId = body.orderId
      }
    } catch {
      // The sentence below covers it.
    }

    if (orderId === null) {
      setStatus('idle')
      setMessage(CHECKOUT_CONFIRMING_MESSAGE)
      return
    }

    router.push(`/order-placed/${orderId}`)
  }

  const startPayment = async () => {
    const delivery = {
      city: readValue('city'),
      foodPreference: readFoodPreference(),
      line1: readValue('line1'),
      line2: readValue('line2'),
      name: readValue('name'),
      phone: readValue('phone'),
      pincode: readValue('pincode'),
      state: readValue('state'),
    }

    const parsed = orderDeliverySchema.safeParse(delivery)

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      return
    }

    setErrors({})
    setMessage(null)
    setStatus('starting')

    let created: {
      amount: number
      gatewayOrderId: string
      keyId: string
    } | null = null
    let failure: string = CHECKOUT_FAILED_MESSAGE

    try {
      const answer = await fetch('/api/orders/create', {
        body: JSON.stringify({
          delivery: parsed.data,
          duration: selection.durationLabel,
          note: readNote(),
          plan: selection.planSlug,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const body = (await answer.json().catch(() => null)) as { message?: string } | null

      // The server resolves the live price and opens the gateway order. Accept
      // its own shape check so a successful create is never mistaken for a
      // failed one.
      const candidate = answer.ok ? readCreatedOrder(body) : null

      if (candidate) {
        created = candidate
      } else if (body?.message) {
        failure = body.message
      }
    } catch {
      // The failure sentence below covers it.
    }

    if (!created) {
      setStatus('idle')
      setMessage(failure)
      return
    }

    setStatus('paying')

    const openPopup = () => {
      const Razorpay = window.Razorpay

      if (!Razorpay) {
        setStatus('idle')
        setMessage(CHECKOUT_SCRIPT_FAILED_MESSAGE)
        return
      }

      try {
        const checkout = new Razorpay({
          amount: created.amount,
          currency: 'INR',
          description: 'UNAVE meal plan',
          handler: (response) => {
            void verifyAndContinue(response)
          },
          key: created.keyId,
          modal: {
            ondismiss: () => {
              setStatus('idle')
              setMessage(CHECKOUT_CLOSED_MESSAGE)
            },
          },
          name: 'UNAVE kitchen',
          order_id: created.gatewayOrderId,
          prefill: { email, name: parsed.data.name, phone: parsed.data.phone },
          theme: { color: '#1a4b36' },
        })

        checkout.open()
      } catch {
        setStatus('idle')
        setMessage(CHECKOUT_SCRIPT_FAILED_MESSAGE)
      }
    }

    // The script tag sits above this component; by submit time it is almost
    // always in. A slow or blocked script gets fifteen seconds, then a sentence
    // that names the likely cause instead of the generic failure.
    if (window.Razorpay) {
      openPopup()
    } else {
      const timer = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(timer)
          openPopup()
        }
      }, 100)
      setTimeout(() => {
        if (!window.Razorpay) {
          clearInterval(timer)
          setStatus('idle')
          setMessage(CHECKOUT_SCRIPT_FAILED_MESSAGE)
        }
      }, 15_000)
    }
  }

  const busy = status !== 'idle'

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <form
        className="flex flex-col gap-5"
        method="post"
        onSubmit={(event) => {
          event.preventDefault()
          void startPayment()
        }}
        noValidate
      >
        <div>
          <h2 className="text-h3">{CHECKOUT_DELIVERY_HEADING}</h2>
          <p className="text-ink-600 mt-2 text-sm leading-6">{CHECKOUT_DELIVERY_INTRO}</p>
        </div>

        <div>
          <label className={FIELD_LABEL} htmlFor="checkout-name">
            {CHECKOUT_NAME_LABEL}
          </label>
          <input
            autoComplete="name"
            className={cn(FIELD_INPUT, errors.name && 'border-red-600')}
            defaultValue={defaults.name}
            id="checkout-name"
            name="name"
            type="text"
          />
          {errors.name ? <p className={FIELD_ERROR}>{errors.name}</p> : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={FIELD_LABEL} htmlFor="checkout-phone">
              {CHECKOUT_PHONE_LABEL}
            </label>
            <input
              autoComplete="tel"
              className={cn(FIELD_INPUT, errors.phone && 'border-red-600')}
              defaultValue={defaults.phone}
              id="checkout-phone"
              inputMode="tel"
              name="phone"
              type="tel"
            />
            {errors.phone ? <p className={FIELD_ERROR}>{errors.phone}</p> : null}
          </div>

          <div>
            <label className={FIELD_LABEL} htmlFor="checkout-pincode">
              {CHECKOUT_PINCODE_LABEL}
            </label>
            <input
              autoComplete="postal-code"
              className={cn(FIELD_INPUT, errors.pincode && 'border-red-600')}
              defaultValue={defaults.pincode}
              id="checkout-pincode"
              inputMode="numeric"
              name="pincode"
            />
            {errors.pincode ? <p className={FIELD_ERROR}>{errors.pincode}</p> : null}
          </div>
        </div>

        <div>
          <label className={FIELD_LABEL} htmlFor="checkout-line1">
            {CHECKOUT_ADDRESS_LABEL}
          </label>
          <input
            autoComplete="address-line1"
            className={cn(FIELD_INPUT, errors.line1 && 'border-red-600')}
            defaultValue={defaults.line1}
            id="checkout-line1"
            name="line1"
            type="text"
          />
          {errors.line1 ? <p className={FIELD_ERROR}>{errors.line1}</p> : null}
        </div>

        <div>
          <label className={FIELD_LABEL} htmlFor="checkout-line2">
            {CHECKOUT_ADDRESS_OPTIONAL_LABEL}
          </label>
          <input
            autoComplete="address-line2"
            className={FIELD_INPUT}
            defaultValue={defaults.line2}
            id="checkout-line2"
            name="line2"
            type="text"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={FIELD_LABEL} htmlFor="checkout-city">
              {CHECKOUT_CITY_LABEL}
            </label>
            <input
              autoComplete="address-level2"
              className={cn(FIELD_INPUT, errors.city && 'border-red-600')}
              defaultValue={defaults.city}
              id="checkout-city"
              name="city"
              type="text"
            />
            {errors.city ? <p className={FIELD_ERROR}>{errors.city}</p> : null}
          </div>

          <div>
            <label className={FIELD_LABEL} htmlFor="checkout-state">
              {CHECKOUT_STATE_LABEL}
            </label>
            <input
              autoComplete="address-level1"
              className={cn(FIELD_INPUT, errors.state && 'border-red-600')}
              defaultValue={defaults.state}
              id="checkout-state"
              name="state"
              type="text"
            />
            {errors.state ? <p className={FIELD_ERROR}>{errors.state}</p> : null}
          </div>
        </div>

        <FoodPreferenceSelect
          defaultValue={defaults.foodPreference}
          id="checkout-food-preference"
          label={CHECKOUT_FOOD_LABEL}
        />

        <div>
          <label className={FIELD_LABEL} htmlFor="checkout-note">
            {CHECKOUT_NOTE_LABEL}
          </label>
          <textarea
            className={cn(FIELD_INPUT, 'h-auto min-h-24 py-2')}
            id="checkout-note"
            name="note"
            placeholder={CHECKOUT_NOTE_PLACEHOLDER}
            rows={3}
          />
        </div>

        {message ? (
          <p className="text-ink-900 rounded-lg bg-gold-100 p-4 text-sm leading-6" role="alert">
            {message}
          </p>
        ) : null}

        <button
          className={cn(CTA_BASE, CTA_VARIANTS.primary, 'w-full sm:w-auto')}
          disabled={busy}
          type="submit"
        >
          {busy ? CHECKOUT_PAY_PENDING : CHECKOUT_PAY_CTA}
        </button>
      </form>
    </div>
  )
}