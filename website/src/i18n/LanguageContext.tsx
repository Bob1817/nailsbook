import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import translations, { type Lang } from './translations'

type Translations = typeof translations.zh

interface LanguageContextValue {
  lang: Lang
  t: Translations
  toggleLang: () => void
  isZh: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))
  }, [])

  const value: LanguageContextValue = {
    lang,
    t: translations[lang] as Translations,
    toggleLang,
    isZh: lang === 'zh',
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
