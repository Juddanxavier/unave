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

import type { AccessLinkCopy } from '../copy'

export type AccessLinkEmailProps = {
  copy: AccessLinkCopy
  link: string
  recipientName?: string
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

export const AccessLinkEmail: React.FC<AccessLinkEmailProps> = ({
  copy,
  link,
  recipientName,
}) => (
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
            {copy.buttonLabel}
          </Button>
          <Hr style={rule} />
          <Text style={small}>{copy.footerNote}</Text>
          <Text style={small}>{copy.signature}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default AccessLinkEmail
