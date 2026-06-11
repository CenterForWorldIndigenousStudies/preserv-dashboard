'use client'

import { useState, type ReactElement } from 'react'
import { Button } from '@atoms/Button'
import { IconPlus } from '@atoms/icons/IconPlus'
import { CollectionsAccordion } from '@organisms/CollectionsAccordion'
import { PageHeader } from '@organisms/PageHeader'
import { AddCollectionDialog } from '@organisms/AddCollectionDialog'
import type { CollectionWithMeta } from 'types/collections'

interface CollectionsPageClientProps {
  collections: CollectionWithMeta[]
}

export function CollectionsPageClient({ collections }: CollectionsPageClientProps): ReactElement {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collections"
        title="Document Collections"
        description="Browse all document collections and their associated documents."
      />

      <div className="flex justify-end">
        <Button variant="primary" startIcon={<IconPlus size={16} />} onClick={() => setIsAddDialogOpen(true)}>
          Add Collection
        </Button>
      </div>

      <CollectionsAccordion collections={collections} />

      <AddCollectionDialog open={isAddDialogOpen} collections={collections} onClose={() => setIsAddDialogOpen(false)} />
    </div>
  )
}
