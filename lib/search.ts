export const STATUS_OPTIONS = [
  'APPROVED',
  'FORMAT_ERRORS',
  'GENERAL_ERRORS',
  'METADATA_ISSUES',
  'NEEDS_REVIEW',
  'REJECTED',
  'VALIDATED',
] as const

export const DOCUMENT_TYPE_OPTIONS = ['all', 'unique', 'duplicate'] as const

export const ACCESS_LEVEL_OPTIONS = ['open access', 'restricted', 'internal', 'confidential'] as const

export type StatusOption = string
export type DocumentTypeOption = (typeof DOCUMENT_TYPE_OPTIONS)[number]
export type AccessLevelOption = (typeof ACCESS_LEVEL_OPTIONS)[number]

export interface AdvancedSearchFilters {
  author?: string
  tag?: string
  statuses?: StatusOption[]
  documentType?: DocumentTypeOption
  batch?: string
  createdFrom?: string
  createdTo?: string
  collection?: string
  accessLevel?: AccessLevelOption
}

export interface FilterOptions {
  collections: string[]
  accessLevels: AccessLevelOption[]
  statuses: StatusOption[]
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function normalizeTextFilter(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : undefined
}

export function normalizeStatuses(value: string[] | undefined): StatusOption[] | undefined {
  if (!value?.length) {
    return undefined
  }

  const seenStatuses = new Set<string>()
  const normalizedValues: StatusOption[] = []

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

export function parseStatusesParam(value: string | string[] | undefined): StatusOption[] | undefined {
  const rawValue = firstSearchParam(value)
  if (!rawValue) {
    return undefined
  }

  return normalizeStatuses(rawValue.split(','))
}

export function serializeStatusesParam(value: StatusOption[] | undefined): string | undefined {
  return value?.length ? value.join(',') : undefined
}

export function normalizeDocumentType(value: string | undefined): DocumentTypeOption | undefined {
  if (!value) {
    return undefined
  }

  return DOCUMENT_TYPE_OPTIONS.includes(value as DocumentTypeOption) ? (value as DocumentTypeOption) : undefined
}

export function normalizeAccessLevel(value: string | undefined): AccessLevelOption | undefined {
  if (!value) {
    return undefined
  }

  const normalizedValue = value.trim().toLowerCase()
  return ACCESS_LEVEL_OPTIONS.includes(normalizedValue as AccessLevelOption)
    ? (normalizedValue as AccessLevelOption)
    : undefined
}

export function normalizeDateFilter(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmedValue = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ? trimmedValue : undefined
}
