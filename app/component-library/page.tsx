import { redirect } from 'next/navigation'
import { Box } from '@mui/material'

import { COMPONENT_LIBRARY_PATH, SIGNIN_PATH } from '@constants/paths'
import { getDashboardSession } from '@root/auth'
import { PAGE_LABELS } from '@constants/pageLabels'

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
    <Box sx={{ height: 'calc(100vh - 8rem)', m: -3, mt: -2 }}>
      <Box
        component={'iframe'}
        src={src}
        id={'storybook-iframe'}
        title={PAGE_LABELS.componentLibrary}
        sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
      />
    </Box>
  )
}
