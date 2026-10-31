import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import React from 'react'

import type { CancellationCopy } from '../copy'

export type CancellationEmailProps = {
  cancelledOn?: string | null
  contactLink: string
  copy: CancellationCopy
  planTitle: string
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

const detail = {
  color: '#18181b',
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: '24px',
  margin: '0 0 8px',
  whiteSpace: 'pre-wrap' as const,
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

const link = {
  color: '#18181b',
  textDecoration: 'underline',
}

export const CancellationEmail: React.FC<CancellationEmailProps> = ({
  cancelledOn,
  contactLink,
  copy,
  planTitle,
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
          <Hr style={rule} />
          <Text style={detail}>{planTitle}</Text>
          {cancelledOn ? <Text style={detail}>Cancelled on {cancelledOn}</Text> : null}
          <Hr style={rule} />
          <Text style={small}>{copy.footerNote}</Text>
          <Text style={small}>
            <Link href={contactLink} style={link}>
              Contact us
            </Link>
          </Text>
          <Text style={small}>{copy.signature}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default CancellationEmail
