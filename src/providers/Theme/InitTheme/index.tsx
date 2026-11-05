import Script from 'next/script'
import React from 'react'

import { defaultTheme } from '../ThemeSelector/types'

export const InitTheme: React.FC = () => {
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script
      dangerouslySetInnerHTML={{
        __html: `
  (function () {
    // The site is light-only; the admin panel keeps its own theming.
    document.documentElement.setAttribute('data-theme', '${defaultTheme}')
  })();
  `,
      }}
      id="theme-script"
      strategy="beforeInteractive"
    />
  )
}
