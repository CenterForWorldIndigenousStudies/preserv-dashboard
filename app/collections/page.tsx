import type { ReactElement } from 'react'

import { CollectionsPageClient } from '@organisms/CollectionsPageClient'
import { getCollections } from '@lib/queries'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage(): Promise<ReactElement> {
  const collections = await getCollections()

  return <CollectionsPageClient collections={collections} />
}
