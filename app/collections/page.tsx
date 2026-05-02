import type { ReactElement } from 'react'

import { PageHeader } from '@organisms/PageHeader'
import { CollectionsAccordion } from '@organisms/CollectionsAccordion'
import { getCollections } from '@lib/queries'
import type { CollectionWithMeta } from '@lib/types'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage(): Promise<ReactElement> {
  const collections = await getCollections()

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collections"
        title="Document Collections"
        description="Browse all document collections and their associated documents."
      />
      <CollectionsAccordion collections={collections} />
    </div>
  )
}
