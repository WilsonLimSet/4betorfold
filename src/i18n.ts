import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const locales = ['en', 'es', 'zh', 'pt', 'ru', 'fr', 'de', 'ja', 'ko', 'it', 'hi', 'id', 'th', 'vi', 'tr', 'tl', 'pl', 'nl', 'sv', 'cs', 'ar', 'uk', 'he', 'ro', 'el', 'hu', 'fi', 'da', 'ms', 'bn', 'no', 'sk', 'sr', 'hr', 'bg', 'fa', 'ur', 'lt', 'af', 'ca'] as const
export const defaultLocale = 'en' as const

export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  // Wait for the locale (Next.js 15 + next-intl v4)
  let locale = await requestLocale

  // Provide fallback if locale is invalid or undefined
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
