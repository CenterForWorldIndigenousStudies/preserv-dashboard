import type { ReactElement } from 'react'

import { PageHeader } from '@organisms/PageHeader'
import { CollectionsAccordion } from '@organisms/CollectionsAccordion'
import { getCollectionDocuments, getCollections } from '@lib/queries'
import type { CollectionWithMeta, Document } from '@lib/types'

export const dynamic = 'force-dynamic'

interface CollectionWithDocuments extends CollectionWithMeta {
  documents: Document[]
}

export default async function CollectionsPage(): Promise<ReactElement> {
  const collections = await getCollections()
  const collectionsWithDocuments: CollectionWithDocuments[] = await Promise.all(
    collections.map(async (collection) => ({
      ...collection,
      documents: await getCollectionDocuments(collection.id),
    })),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collections"
        title="Document Collections"
        description="Browse all document collections and their associated documents."
      />
      <CollectionsAccordion collections={collectionsWithDocuments} />
    </div>
  )
}
