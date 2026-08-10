import type { ReactElement } from 'react'

import { CollectionsPageClient } from '@organisms/CollectionsPageClient'
import { getCollections, getDocumentFilterOptions } from '@lib/queries/queries'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage(): Promise<ReactElement> {
  const [collections, filterOptions] = await Promise.all([getCollections(), getDocumentFilterOptions()])

  return <CollectionsPageClient collections={collections} filterOptions={filterOptions} />
}
