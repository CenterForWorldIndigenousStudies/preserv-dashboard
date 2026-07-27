import type { ReactElement } from 'react'
import { Stack } from '@mui/material'

import { PAGE_LABELS } from '@constants/pageLabels'
import { ExclusionReviewWorkspace } from '@organisms/ExclusionReviewWorkspace'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

export default function ExclusionReviewPage(): ReactElement {
  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.exclusionReview}
        title="Review include and exclude decisions for one configured Drive root."
        description="Browse one configured Google Drive root and record include or exclude review decisions."
      />
      <ExclusionReviewWorkspace />
    </Stack>
  )
}
