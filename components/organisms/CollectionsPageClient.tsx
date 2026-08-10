'use client'

import { useState, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import { Button } from '@atoms/Button'
import { IconPlus } from '@atoms/icons/IconPlus'
import { CollectionsAccordion } from '@organisms/CollectionsAccordion'
import { PageHeader } from '@organisms/PageHeader'
import { AddCollectionDialog } from '@organisms/AddCollectionDialog'
import { PAGE_LABELS } from '@constants/pageLabels'
import type { FilterOptions } from '@lib/search'
import type { CollectionWithMeta } from 'types/collections'

interface CollectionsPageClientProps {
  collections: CollectionWithMeta[]
  filterOptions: FilterOptions
}

export function CollectionsPageClient({ collections, filterOptions }: CollectionsPageClientProps): ReactElement {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  return (
    <Stack spacing={4}>
      <PageHeader
        eyebrow={PAGE_LABELS.collections}
        title={'Document Collections'}
        description={'Browse all document collections and their associated documents.'}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant={'primary'} startIcon={<IconPlus size={16} />} onClick={() => setIsAddDialogOpen(true)}>
          {'Add Collection'}
        </Button>
      </Box>

      <CollectionsAccordion collections={collections} filterOptions={filterOptions} />

      <AddCollectionDialog open={isAddDialogOpen} collections={collections} onClose={() => setIsAddDialogOpen(false)} />
    </Stack>
  )
}
