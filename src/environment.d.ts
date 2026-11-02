declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      CRON_SECRET: string
      PREVIEW_SECRET: string

      // Transactional email
      MAIL_FROM_ADDRESS: string
      MAIL_FROM_NAME: string
      MAIL_REPLY_TO: string
      ZEPTOMAIL_API_KEY: string
      ZEPTOMAIL_API_URL: string
      SMTP_HOST: string
      SMTP_PORT: string
      SMTP_USER: string
      SMTP_PASSWORD: string
      SMTP_SECURE: string

      // Razorpay (optional: blank keeps the store read only)
      RAZORPAY_KEY_ID: string
      RAZORPAY_KEY_SECRET: string
      RAZORPAY_WEBHOOK_SECRET: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
