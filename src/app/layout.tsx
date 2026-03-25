import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '4 Bet or Fold - Home Game Tracker & Poker Buy-in Manager',
  description: '4 Bet or Fold Home Game Tracker - Free poker game manager by Wilson Lim. Track buy-ins, cash-outs, and player balances with automatic verification. Perfect for home poker games, tournaments, and cash games.',
  keywords: 'home game tracker, poker tracker, home game manager, poker buy-in tracker, poker cash out calculator, home poker game, poker balance tracker, poker game manager, home game calculator, 4 bet or fold',
  openGraph: {
    title: 'Home Game Tracker - Poker Buy-in Manager',
    description: 'Free poker home game tracker. Track buy-ins, cash-outs, and player balances automatically.',
    locale: 'en_US',
    siteName: 'Home Game Tracker',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Home Game Tracker - Poker Buy-in Manager',
    description: 'Free poker home game tracker. Track buy-ins, cash-outs, and player balances automatically.',
  },
  category: 'games',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
