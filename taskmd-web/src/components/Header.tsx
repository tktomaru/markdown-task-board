import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '@/store/useThemeStore'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useThemeStore()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ja' ? 'en' : 'ja'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️'
      case 'dark':
        return '🌙'
      case 'system':
        return '💻'
    }
  }

  return (
    <header style={{
      padding: '1rem 2rem',
      borderBottom: `1px solid var(--color-border)`,
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t('app.title')}
        </h1>
      </Link>
      <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--color-text)' }}>{t('nav.home')}</Link>

        <button
          onClick={cycleTheme}
          title={t('common.theme')}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          {getThemeIcon()} {t(`theme.${theme}`)}
        </button>

        <button
          onClick={toggleLanguage}
          title={t('common.language')}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
        >
          {i18n.language === 'ja' ? '🇯🇵 日本語' : '🇬🇧 English'}
        </button>
      </nav>
    </header>
  )
}
