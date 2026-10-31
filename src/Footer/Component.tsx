import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import { FooterView } from './View'

export async function Footer() {
  const footerData = await getCachedGlobal('footer', 1)()

  return <FooterView data={footerData} />
}
