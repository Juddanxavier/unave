'use client'

import React, { createContext, useCallback, useEffect, useState } from 'react'

import type { Theme, ThemeContextType } from './types'

import canUseDOM from '@/utilities/canUseDOM'
import { defaultTheme } from './ThemeSelector/types'

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
}

const ThemeContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme | undefined>(
    canUseDOM ? (document.documentElement.getAttribute('data-theme') as Theme) : undefined,
  )

  // The site is light-only: no OS preference, no stored preference, no toggle.
  // The admin panel keeps its own theming through Payload's admin UI.
  const setTheme = useCallback(() => {
    setThemeState(defaultTheme)
    document.documentElement.setAttribute('data-theme', defaultTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', defaultTheme)
    setThemeState(defaultTheme)
  }, [])

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => React.use(ThemeContext)
