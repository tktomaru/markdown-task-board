import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

const getActualTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      actualTheme: getActualTheme('system'),
      setTheme: (theme: Theme) => {
        set({ theme, actualTheme: getActualTheme(theme) })

        // Apply theme to document
        const actualTheme = getActualTheme(theme)
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(actualTheme)
        document.documentElement.setAttribute('data-theme', actualTheme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on load
          const actualTheme = getActualTheme(state.theme)
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(actualTheme)
          document.documentElement.setAttribute('data-theme', actualTheme)
        }
      },
    }
  )
)

// Listen for system theme changes
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme, setTheme } = useThemeStore.getState()
    if (theme === 'system') {
      setTheme('system') // Re-apply to update actualTheme
    }
  })
}
