import type { ReactElement } from 'react'
import { notFound } from 'next/navigation'

import { CollectionsPageClient } from '@organisms/CollectionsPageClient'
import { getCollections } from '@lib/queries/collectionQueries'
import { getDocumentFilterOptions } from '@lib/queries/queries'

export const dynamic = 'force-dynamic'

interface CollectionDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function resolveReturnHref(searchParams: Record<string, string | string[] | undefined>): string | undefined {
  const from = firstSearchParam(searchParams.from)
  return from && from.startsWith('/') && !from.startsWith('//') ? from : undefined
}

function resolveReturnLocation(searchParams: Record<string, string | string[] | undefined>): string | undefined {
  const fromLabel = firstSearchParam(searchParams.fromLabel)?.trim()
  return fromLabel ? fromLabel.slice(0, 80) : undefined
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: CollectionDetailPageProps): Promise<ReactElement> {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  if (!id.trim()) {
    notFound()
  }

  const [collections, filterOptions] = await Promise.all([getCollections(), getDocumentFilterOptions()])
  const collection = collections.find((candidate) => candidate.id === id)
  if (!collection) {
    notFound()
  }

  return (
    <CollectionsPageClient
      collection={collection}
      filterOptions={filterOptions}
      returnHref={resolveReturnHref(resolvedSearchParams)}
      returnLocation={resolveReturnLocation(resolvedSearchParams)}
    />
  )
}
