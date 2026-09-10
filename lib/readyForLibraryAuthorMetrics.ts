import { db } from '@lib/db'

/**
 * Count distinct documents linked to the given author contributor name.
 */
export async function getUniqueDocumentCountByAuthor(authorName: string): Promise<number> {
  const normalizedAuthorName = authorName.trim()
  if (!normalizedAuthorName) {
    return 0
  }

  const documentLinks = await db.document_to_contributors.findMany({
    where: {
      role: 'author',
      contributors: {
        name: normalizedAuthorName,
      },
    },
    distinct: ['document_id'],
    select: {
      document_id: true,
    },
  })

  return documentLinks.length
}
