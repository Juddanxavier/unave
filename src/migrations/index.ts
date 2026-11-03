import * as migration_20261029_120431_baseline from './20261029_120431_baseline';
import * as migration_20261029_120501_guest_plan_page from './20261029_120501_guest_plan_page';
import * as migration_20261030_160000_customer_accounts from './20261030_160000_customer_accounts';
import * as migration_20261030_170000_remove_guest_plan_links from './20261030_170000_remove_guest_plan_links';
import * as migration_20261031_090000_payload_customer_auth from './20261031_090000_payload_customer_auth';
import * as migration_20261031_120000_customer_has_password from './20261031_120000_customer_has_password';
import * as migration_20261031_130000_customer_profile from './20261031_130000_customer_profile';
import * as migration_20261031_150000_enquiries from './20261031_150000_enquiries';
import * as migration_20261031_180000_remove_plans_subscriptions from './20261031_180000_remove_plans_subscriptions';
import * as migration_20261101_120000_create_plans_and_orders from './20261101_120000_create_plans_and_orders';
import * as migration_20261101_125000_chrome_schema_backfill from './20261101_125000_chrome_schema_backfill';
import * as migration_20261101_130000_plans_chrome from './20261101_130000_plans_chrome';
import * as migration_20261101_140000_plan_points from './20261101_140000_plan_points';
import * as migration_20261101_150000_paid_orders_only from './20261101_150000_paid_orders_only';
import * as migration_20261102_200000_order_requests from './20261102_200000_order_requests';


export const migrations = [
  {
    up: migration_20261029_120431_baseline.up,
    down: migration_20261029_120431_baseline.down,
    name: '20261029_120431_baseline',
  },
  {
    up: migration_20261029_120501_guest_plan_page.up,
    down: migration_20261029_120501_guest_plan_page.down,
    name: '20261029_120501_guest_plan_page'
  },
  {
    up: migration_20261030_160000_customer_accounts.up,
    down: migration_20261030_160000_customer_accounts.down,
    name: '20261030_160000_customer_accounts',
  },
  {
    up: migration_20261030_170000_remove_guest_plan_links.up,
    down: migration_20261030_170000_remove_guest_plan_links.down,
    name: '20261030_170000_remove_guest_plan_links',
  },
  {
    up: migration_20261031_090000_payload_customer_auth.up,
    down: migration_20261031_090000_payload_customer_auth.down,
    name: '20261031_090000_payload_customer_auth',
  },
  {
    up: migration_20261031_120000_customer_has_password.up,
    down: migration_20261031_120000_customer_has_password.down,
    name: '20261031_120000_customer_has_password',
  },
  {
    up: migration_20261031_130000_customer_profile.up,
    down: migration_20261031_130000_customer_profile.down,
    name: '20261031_130000_customer_profile',
  },
  {
    up: migration_20261031_150000_enquiries.up,
    down: migration_20261031_150000_enquiries.down,
    name: '20261031_150000_enquiries',
  },
  {
    up: migration_20261031_180000_remove_plans_subscriptions.up,
    down: migration_20261031_180000_remove_plans_subscriptions.down,
    name: '20261031_180000_remove_plans_subscriptions',
  },
  {
    up: migration_20261101_120000_create_plans_and_orders.up,
    down: migration_20261101_120000_create_plans_and_orders.down,
    name: '20261101_120000_create_plans_and_orders',
  },
  {
    up: migration_20261101_125000_chrome_schema_backfill.up,
    down: migration_20261101_125000_chrome_schema_backfill.down,
    name: '20261101_125000_chrome_schema_backfill',
  },
  {
    up: migration_20261101_130000_plans_chrome.up,
    down: migration_20261101_130000_plans_chrome.down,
    name: '20261101_130000_plans_chrome',
  },
  {
    up: migration_20261101_140000_plan_points.up,
    down: migration_20261101_140000_plan_points.down,
    name: '20261101_140000_plan_points',
  },
  {
    up: migration_20261101_150000_paid_orders_only.up,
    down: migration_20261101_150000_paid_orders_only.down,
    name: '20261101_150000_paid_orders_only',
  },
  {
    up: migration_20261102_200000_order_requests.up,
    down: migration_20261102_200000_order_requests.down,
    name: '20261102_200000_order_requests',
  },
];
