import { ACCESS_LEVEL_OPTIONS, type FilterOptions } from '@lib/search'
import { db } from '@lib/db'
import type { FailureItem } from 'types/documents'
import type { PipelineSummary } from 'types/pipeline'




export async function getPipelineSummary(): Promise<PipelineSummary> {
  const [total, qualityRows] = await Promise.all([
    db.documents.count(),
    db.document_quality.groupBy({
      by: ['validation_status'],
      _count: { _all: true },
    }),
  ])

  const by_validation_status: Record<string, number> = {}
  for (const row of qualityRows) {
    const key = row.validation_status ?? 'unknown'
    by_validation_status[key] = row._count._all
  }

  return {
    total,
    by_validation_status,
    by_state: {},
  }
}

// getFailures
// Returns an empty array.  The documents table has no `state` column, so
// there is no reliable way to determine which documents have failed.
// ---------------------------------------------------------------------------
export async function getFailures(): Promise<FailureItem[]> {
  // documents table has no state column — cannot determine failures
  return await Promise.resolve([])
}

export async function getDocumentFilterOptions(): Promise<FilterOptions> {
  const [collections, statuses] = await Promise.all([getDistinctCollections(), getDistinctValidationStatuses()])

  return {
    collections,
    accessLevels: [...ACCESS_LEVEL_OPTIONS],
    statuses,
  }
}

// ---------------------------------------------------------------------------
// getDistinctCollections
// Returns collection names from the collections table joined through tags.
// These are the only values that should appear in the overview collection
// filter; arbitrary tags are not collections.
// ---------------------------------------------------------------------------
export async function getDistinctCollections(): Promise<string[]> {
  const rows = await db.collections.findMany({
    include: {
      tags: {
        select: { name: true },
      },
    },
    orderBy: {
      tags: {
        name: 'asc',
      },
    },
  })

  const collectionSet = new Set<string>()
  for (const row of rows) {
    const name = row.tags?.name?.trim()
    if (name) {
      collectionSet.add(name)
    }
  }
  return Array.from(collectionSet)
}

export async function getDistinctValidationStatuses(): Promise<string[]> {
  const rows = await db.document_quality.findMany({
    distinct: ['validation_status'],
    where: { validation_status: { not: null } },
    select: { validation_status: true },
    orderBy: { validation_status: 'asc' },
  })

  return rows.map((row) => row.validation_status?.trim()).filter((status): status is string => Boolean(status))
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
