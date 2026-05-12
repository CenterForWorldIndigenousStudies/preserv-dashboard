export const OVERVIEW_STATUS_OPTIONS = [
  'APPROVED',
  'FORMAT_ERRORS',
  'GENERAL_ERRORS',
  'METADATA_ISSUES',
  'NEEDS_REVIEW',
  'REJECTED',
  'VALIDATED',
] as const

export const OVERVIEW_DOCUMENT_TYPE_OPTIONS = ['all', 'unique', 'duplicate'] as const

export const OVERVIEW_ACCESS_LEVEL_OPTIONS = [
  'open access',
  'restricted',
  'internal',
  'confidential',
] as const

export type OverviewStatusOption = string
export type OverviewDocumentTypeOption = (typeof OVERVIEW_DOCUMENT_TYPE_OPTIONS)[number]
export type OverviewAccessLevelOption = (typeof OVERVIEW_ACCESS_LEVEL_OPTIONS)[number]

export interface OverviewAdvancedSearchFilters {
  author?: string
  statuses?: OverviewStatusOption[]
  documentType?: OverviewDocumentTypeOption
  batch?: string
  createdFrom?: string
  createdTo?: string
  collection?: string
  accessLevel?: OverviewAccessLevelOption
}

export interface OverviewFilterOptions {
  collections: string[]
  accessLevels: OverviewAccessLevelOption[]
  statuses: OverviewStatusOption[]
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function normalizeOverviewTextFilter(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : undefined
}

export function normalizeOverviewStatuses(value: string[] | undefined): OverviewStatusOption[] | undefined {
  if (!value?.length) {
    return undefined
  }

  const seenStatuses = new Set<string>()
  const normalizedValues: OverviewStatusOption[] = []

  for (const statusValue of value) {
    const normalizedStatus = statusValue.trim().toUpperCase()

    if (!normalizedStatus || seenStatuses.has(normalizedStatus)) {
      continue
    }

    seenStatuses.add(normalizedStatus)
    normalizedValues.push(normalizedStatus)
  }

  return normalizedValues.length > 0 ? normalizedValues : undefined
}

export function parseOverviewStatusesParam(value: string | string[] | undefined): OverviewStatusOption[] | undefined {
  const rawValue = firstSearchParam(value)
  if (!rawValue) {
    return undefined
  }

  return normalizeOverviewStatuses(rawValue.split(','))
}

export function serializeOverviewStatusesParam(value: OverviewStatusOption[] | undefined): string | undefined {
  return value?.length ? value.join(',') : undefined
}

export function normalizeOverviewDocumentType(value: string | undefined): OverviewDocumentTypeOption | undefined {
  if (!value) {
    return undefined
  }

  return OVERVIEW_DOCUMENT_TYPE_OPTIONS.includes(value as OverviewDocumentTypeOption)
    ? (value as OverviewDocumentTypeOption)
    : undefined
}

export function normalizeOverviewAccessLevel(value: string | undefined): OverviewAccessLevelOption | undefined {
  if (!value) {
    return undefined
  }

  const normalizedValue = value.trim().toLowerCase()
  return OVERVIEW_ACCESS_LEVEL_OPTIONS.includes(normalizedValue as OverviewAccessLevelOption)
    ? (normalizedValue as OverviewAccessLevelOption)
    : undefined
}

export function normalizeOverviewDateFilter(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmedValue = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ? trimmedValue : undefined
}
