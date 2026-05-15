import type { Metadata } from 'next'
import type { ReactElement, ReactNode } from 'react'
import { Rethink_Sans, Work_Sans } from 'next/font/google'

import './globals.css'
import LayoutBody from '@components/LayoutBody'
import Providers from '@components/Providers'
import { getDashboardSession } from '@root/auth'

const rethinkSans = Rethink_Sans({
  subsets: ['latin'],
  variable: '--font-rethink-sans',
  display: 'swap',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CWIS Preservation Pipeline Dashboard',
  description: 'Operational dashboard for CWIS preservation pipeline documents, reviews, and failures.',
}

export const preferredRegion = 'sfo1'

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>): Promise<ReactElement> {
  const session = await getDashboardSession()

  return (
    <html lang="en" className={`${rethinkSans.variable} ${workSans.variable}`}>
      <body className="font-sans antialiased">
        <Providers session={session}>
          <LayoutBody isAuthenticated={!!session}>{children}</LayoutBody>
        </Providers>
      </body>
    </html>
  )
}
