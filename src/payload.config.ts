import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Customers } from './collections/Customers'
import { EmailLog } from './collections/EmailLog'
import { Enquiries } from './collections/Enquiries'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Payments } from './collections/Payments'
import { Plans } from './collections/Plans'
import { Posts } from './collections/Posts'
import { Subscriptions } from './collections/Subscriptions'
import { Users } from './collections/Users'
import { unaveEmailAdapter } from './email/adapter'
import { emailTestEndpoint } from './endpoints/emailTest'
import { Footer } from './Footer/config'
import { EmailSettings } from './globals/EmailSettings'
import { Header } from './Header/config'
import { pruneEmailLogTask } from './jobs/pruneEmailLog'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
      graphics: {
        Icon: '@/components/AdminIcon',
        Logo: '@/components/AdminLogo',
      },
    },
    meta: {
      description: 'Unave admin, food plans and subscriptions',
      icons: [
        {
          rel: 'icon',
          type: 'image/png',
          url: '/favicon-192.png',
        },
      ],
      titleSuffix: '| Unave',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    Customers,
    Enquiries,
    Plans,
    Subscriptions,
    Payments,
    EmailLog,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  email: unaveEmailAdapter,
  endpoints: [emailTestEndpoint],
  globals: [Header, Footer, EmailSettings],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [pruneEmailLogTask],
  },
})
