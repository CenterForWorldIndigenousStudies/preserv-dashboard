import { redirect } from 'next/navigation'

import { COMPONENT_LIBRARY_PATH, SIGNIN_PATH } from '@constants/paths'
import { getDashboardSession } from '@root/auth'

function buildStorybookUrl(): string {
  const baseUrl = process.env.STORYBOOK_URL
  if (!baseUrl) {
    throw new Error('STORYBOOK_URL is not configured')
  }

  return new URL('index.html', `${baseUrl.replace(/\/+$/, '')}/`).toString()
}

export default async function ComponentLibraryPage() {
  const session = await getDashboardSession()
  if (!session) {
    redirect(`${SIGNIN_PATH}?callbackUrl=${COMPONENT_LIBRARY_PATH}`)
  }

  const src = buildStorybookUrl()

  return (
    <div className="-m-6 -mt-4 h-[calc(100vh-8rem)]">
      <iframe src={src} id="storybook-iframe" title="Storybook Component Library" className="h-full w-full border-0" />
    </div>
  )
}
