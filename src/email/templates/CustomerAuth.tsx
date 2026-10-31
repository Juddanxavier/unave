import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import React from 'react'

export type CustomerAuthAction = 'reset' | 'verify'

export type CustomerAuthEmailProps = {
  action: CustomerAuthAction
  link: string
  recipientName?: string
}

/**
 * The two account security messages. They share one layout because they ask the
 * reader to do the same thing: open a single link that we generated and nobody
 * else has. The copy differs, and the reset message must never claim the
 * password is unchanged, because by the time it arrives it may not be.
 */
const COPY: Record<CustomerAuthAction, { heading: string; intro: string; button: string; note: string }> =
  {
    reset: {
      button: 'Choose a new password',
      heading: 'Choose a new password',
      intro:
        'We got a request to set a new UNAVE password. Open the link below to choose one. The link works for the next hour.',
      note: 'If you did not ask for this, you can ignore this message. Nothing changes until you open the link.',
    },
    verify: {
      button: 'Confirm my email',
      heading: 'Confirm your UNAVE account',
      intro:
        'One click and your account is ready. After that you can see every plan we have for you, and stop one whenever you like.',
      note: 'If you did not create an account, you can ignore this message. Nothing happens until you open the link.',
    },
  }

const body = {
  backgroundColor: '#f4f4f5',
  color: '#18181b',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '32px 16px',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '520px',
  padding: '32px',
}

const greeting = {
  color: '#52525b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
}

const heading = {
  color: '#18181b',
  fontSize: '22px',
  fontWeight: 600,
  lineHeight: '30px',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
  whiteSpace: 'pre-wrap' as const,
}

const button = {
  backgroundColor: '#18181b',
  borderRadius: '8px',
  color: '#fafafa',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 20px',
  textDecoration: 'none',
}

const rule = {
  borderColor: '#e4e4e7',
  margin: '28px 0 20px',
}

const small = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 8px',
  whiteSpace: 'pre-wrap' as const,
}

export const CustomerAuthEmail: React.FC<CustomerAuthEmailProps> = ({
  action,
  link,
  recipientName,
}) => {
  const copy = COPY[action]

  return (
    <Html lang="en">
      <Head />
      <Preview>{copy.heading}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            {recipientName ? <Text style={greeting}>Hi {recipientName},</Text> : null}
            <Heading style={heading}>{copy.heading}</Heading>
            <Text style={paragraph}>{copy.intro}</Text>
            <Button href={link} style={button}>
              {copy.button}
            </Button>
            <Hr style={rule} />
            <Text style={small}>{copy.note}</Text>
            <Text style={small}>This message came from UNAVE because someone used this address on our site.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default CustomerAuthEmail
