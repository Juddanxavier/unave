import {
  Body,
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

export type OrderMailVariant = 'confirmation' | 'kitchenNotice'

export type OrderEmailLine = {
  amountLabel: string
  durationLabel: string
  title: string
}

export type OrderEmailDelivery = {
  addressLabel: string
  name: string
  note?: string
  phone: string
}

export type OrderEmailProps = {
  delivery?: OrderEmailDelivery
  intro: string
  lines: OrderEmailLine[]
  outro?: string
  paymentId: string
  recipientName?: string
  totalLabel: string
  variant: OrderMailVariant
}

/**
 * The two order messages, sharing one layout.
 *
 * The confirmation tells the customer what they paid for and that the kitchen
 * has it. The kitchen notice tells the kitchen where to deliver and who to
 * cook for. Both carry the payment id, because that id is the receipt both
 * sides can match against the order row and the gateway dashboard.
 */
const COPY: Record<OrderMailVariant, { heading: string; preview: string }> = {
  confirmation: {
    heading: 'Your UNAVE order is confirmed',
    preview: 'Your payment went through. The kitchen has your order.',
  },
  kitchenNotice: {
    heading: 'New paid order from the website',
    preview: 'A plan order was paid on the website.',
  },
}

const body = {
  backgroundColor: '#f4f4f5',
  color: '#18181b',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
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

const lineRow = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 8px',
}

const totalRow = {
  color: '#18181b',
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: '24px',
  margin: '0 0 24px',
}

const small = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 8px',
  whiteSpace: 'pre-wrap' as const,
}

const rule = {
  borderColor: '#e4e4e7',
  margin: '28px 0 20px',
}

export const OrderEmail: React.FC<OrderEmailProps> = ({
  delivery,
  intro,
  lines,
  outro,
  paymentId,
  recipientName,
  totalLabel,
  variant,
}) => {
  const copy = COPY[variant]

  return (
    <Html lang="en">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            {recipientName ? <Text style={greeting}>Hi {recipientName},</Text> : null}
            <Heading style={heading}>{copy.heading}</Heading>
            <Text style={paragraph}>{intro}</Text>

            {lines.map((line, index) => (
              <Text key={index} style={lineRow}>
                {`${line.title} · ${line.durationLabel} · ${line.amountLabel}`}
              </Text>
            ))}

            <Text style={totalRow}>{`Total: ${totalLabel}`}</Text>

            {delivery ? (
              <>
                <Text style={lineRow}>{`${delivery.name}, ${delivery.phone}`}</Text>
                <Text style={small}>{delivery.addressLabel}</Text>
                {delivery.note ? <Text style={small}>{`Note: ${delivery.note}`}</Text> : null}
              </>
            ) : null}

            <Hr style={rule} />
            <Text style={small}>{`Payment id: ${paymentId}`}</Text>

            {outro ? <Text style={paragraph}>{outro}</Text> : null}
            <Text style={small}>
              {variant === 'confirmation'
                ? 'This message came from UNAVE about an order placed on our site.'
                : 'This notice came from the UNAVE website. The order row in the admin is the record.'}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default OrderEmail
