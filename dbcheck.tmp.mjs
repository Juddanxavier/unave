import 'dotenv/config'
import { createRequire } from 'node:module'

const require = createRequire('C:/websites/unave/package.json')
const { Client } = require(
  'C:/websites/unave/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js',
)

const client = new Client({ connectionString: process.env.DATABASE_URL })
const timeout = setTimeout(() => {
  console.log('TIMEOUT')
  process.exit(2)
}, 20000)

try {
  await client.connect()
  const tables = await client.query(
    "select table_name from information_schema.tables where table_schema='public' and table_name in ('payments','plans','subscriptions')",
  )
  console.log('DB_OK', tables.rows.map((r) => r.table_name).sort().join(','))
  await client.end()
} catch (error) {
  console.log('ERR', error.message)
} finally {
  clearTimeout(timeout)
}
