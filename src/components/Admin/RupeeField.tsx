'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'
import type { NumberFieldClientComponent } from 'payload'

import { formatRupeeInput, rupeesToPaise } from '@/utilities/money'

import './RupeeField.scss'

/**
 * The admin's money field, typed and read in rupees (spec 0007).
 *
 * The database and Razorpay still speak paise, so the field stores paise and
 * this component is the only place the kitchen sees or types rupees. Loading a
 * plan shows `499`, not `49900`. While the input has focus the text is left
 * exactly as typed, so a decimal point is not fought; on blur it snaps back to
 * the value the field actually holds.
 */
export const RupeeField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { setValue, showError, value } = useField<number>({ path })
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => formatRupeeInput(value))

  useEffect(() => {
    if (!focused) setText(formatRupeeInput(value))
  }, [focused, value])

  const disabled = Boolean(readOnly || field.admin?.readOnly)
  const inputID = `field-${path.replace(/\./g, '__')}`
  const description =
    typeof field.admin?.description === 'string' ? field.admin.description : undefined

  return (
    <div
      className={['field-type', 'number', showError && 'error', disabled && 'read-only']
        .filter(Boolean)
        .join(' ')}
    >
      <FieldLabel htmlFor={inputID} label={field.label} path={path} required={field.required} />

      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />

        <div className="rupee-input">
          <span aria-hidden="true" className="rupee-input__symbol">
            ₹
          </span>

          <input
            disabled={disabled}
            id={inputID}
            inputMode="decimal"
            name={path}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              setText(event.target.value)
              setValue(rupeesToPaise(event.target.value))
            }}
            onFocus={() => setFocused(true)}
            type="text"
            value={text}
          />
        </div>

        <FieldDescription description={description} path={path} />
      </div>
    </div>
  )
}
