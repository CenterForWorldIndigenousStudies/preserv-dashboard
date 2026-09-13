import { db } from '@lib/db'

export type DocumentRelationshipKind = 'contributor' | 'publisher'

export interface RelationshipOption {
  id: string
  name: string
  notes: string | null
}

export async function searchDocumentRelationships(
  kind: DocumentRelationshipKind,
  query: string,
): Promise<RelationshipOption[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) {
    return []
  }

  if (kind === 'contributor') {
    return db.contributors.findMany({
      where: { name: { contains: normalizedQuery } },
      orderBy: { name: 'asc' },
      take: 20,
      select: { id: true, name: true, notes: true },
    })
  }

  return db.publishers.findMany({
    where: { name: { contains: normalizedQuery } },
    orderBy: { name: 'asc' },
    take: 20,
    select: { id: true, name: true, notes: true },
  })
}
