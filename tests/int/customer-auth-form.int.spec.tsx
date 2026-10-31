import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { PasswordForm } from '@/components/CustomerAuth/PasswordForm'

/**
 * The browser half of the credential rules.
 *
 * These run against the real component in jsdom, so they prove the thing that is
 * easy to get wrong: that Zod is the check the form actually uses. The form carries
 * `noValidate`, and the first test pins it — without that attribute the browser's
 * `required` and `type="email"` checks swallow the submit event and Zod's messages
 * never render.
 */

afterEach(cleanup)

const signIn = () =>
  render(
    <PasswordForm
      action="/api/customers/login"
      emailField
      idPrefix="signin"
      intent="sign-in"
      password={{ autoComplete: 'current-password', hint: null, label: 'Password' }}
      submit="Sign in"
    />,
  )

const signUp = () =>
  render(
    <PasswordForm
      action="/api/customers/login"
      emailField
      idPrefix="signup"
      intent="sign-up"
      submit="Sign up"
    />,
  )

const forgot = () =>
  render(
    <PasswordForm
      action="/api/customers/forgot-password"
      emailField
      idPrefix="forgot"
      intent="forgot"
      password={false}
      submit="Email me"
    />,
  )

const formOf = (container: HTMLElement) => container.querySelector('form') as HTMLFormElement

const type = (label: string, value: string) => {
  fireEvent.input(screen.getByLabelText(label), { target: { value } })
}

describe('the form defers validation to Zod', () => {
  it('turns off the browser layer that would otherwise hide Zod', () => {
    const { container } = signIn()

    expect(formOf(container).noValidate).toBe(true)
  })

  it('reports an empty sign-in against both fields', () => {
    const { container } = signIn()

    fireEvent.submit(formOf(container))

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy()
    expect(screen.getByText('Enter your password.')).toBeTruthy()
  })

  it('reports a password under the minimum on sign up', () => {
    const { container } = signUp()

    type('Email address', 'priya@example.com')
    type('Password', 'short')
    fireEvent.submit(formOf(container))

    expect(screen.getByText('Use at least 10 characters.')).toBeTruthy()
    expect(screen.queryByText('Please enter a valid email address.')).toBeNull()
  })

  it('accepts a sign up that meets both rules', () => {
    const { container } = signUp()

    type('Email address', 'priya@example.com')
    type('Password', 'longenough1')
    fireEvent.submit(formOf(container))

    expect(screen.queryByText('Use at least 10 characters.')).toBeNull()
    expect(screen.queryByText('Please enter a valid email address.')).toBeNull()
  })

  it('leaves the address alone on the forgot card, which asks for no password', () => {
    const { container } = forgot()

    fireEvent.submit(formOf(container))

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy()
    expect(screen.queryByText('Enter your password.')).toBeNull()
  })
})

describe('the field checks itself on blur', () => {
  it('names the address as it is left', () => {
    signIn()

    const email = screen.getByLabelText('Email address')
    fireEvent.input(email, { target: { value: 'not-an-address' } })
    fireEvent.focusOut(email)

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy()
  })

  it('drops the message once the value is corrected', () => {
    signIn()

    const email = screen.getByLabelText('Email address')
    fireEvent.input(email, { target: { value: 'not-an-address' } })
    fireEvent.focusOut(email)
    fireEvent.input(email, { target: { value: 'priya@example.com' } })

    expect(screen.queryByText('Please enter a valid email address.')).toBeNull()
  })
})
