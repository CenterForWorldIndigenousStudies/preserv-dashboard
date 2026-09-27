import type { ReactElement } from 'react'

import { CollectionsPageClient } from '@organisms/CollectionsPageClient'
import { getCollectionPage, parseCollectionQueryParams } from '@lib/queries/collectionQueries'
import { getDocumentFilterOptions } from '@lib/queries/queries'

export const dynamic = 'force-dynamic'

interface CollectionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps): Promise<ReactElement> {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseCollectionQueryParams(resolvedSearchParams)
  const [initialData, filterOptions] = await Promise.all([
    getCollectionPage(initialQuery),
    getDocumentFilterOptions(),
  ])

  return (
    <CollectionsPageClient
      filterOptions={filterOptions}
      initialData={initialData}
      initialQuery={initialQuery}
    />
  )
}
