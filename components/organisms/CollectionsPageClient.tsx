'use client'

import type { ReactElement } from 'react'
import Stack from '@mui/material/Stack'

import { COLLECTIONS_PATH } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { ReturnToPreviousPage } from '@atoms/ReturnToPreviousPage'
import { CollectionDetails } from '@organisms/CollectionDetails'
import { CollectionsTable } from '@organisms/CollectionsTable'
import { PageHeader } from '@organisms/PageHeader'
import type { FilterOptions } from '@lib/search'
import type { CollectionListPageResult, CollectionTableQuery, CollectionWithMeta } from 'types/collections'

interface CollectionsPageClientProps {
  filterOptions: FilterOptions
  collection?: CollectionWithMeta
  initialData?: CollectionListPageResult
  initialQuery?: CollectionTableQuery
  returnHref?: string
  returnLocation?: string
}

export function CollectionsPageClient({
  filterOptions,
  collection,
  initialData,
  initialQuery,
  returnHref = COLLECTIONS_PATH,
  returnLocation = PAGE_LABELS.collections,
}: CollectionsPageClientProps): ReactElement {
  const isCollectionDetail = Boolean(collection)

  return (
    <Stack spacing={4}>
      {collection ? (
        <ReturnToPreviousPage href={returnHref} label={`Return to ${returnLocation}`} />
      ) : null}
      <PageHeader
        eyebrow={isCollectionDetail ? PAGE_LABELS.collectionDetail : PAGE_LABELS.collections}
        title={collection?.collection_name ?? 'Document Collections'}
        description={
          isCollectionDetail
            ? 'Manage this document collection and its associated documents.'
            : 'Browse all document collections and their associated documents.'
        }
      />

      {collection ? (
        <CollectionDetails collection={collection} filterOptions={filterOptions} />
      ) : initialData && initialQuery ? (
        <CollectionsTable initialData={initialData} initialQuery={initialQuery} filterOptions={filterOptions} />
      ) : null}
    </Stack>
  )
}
