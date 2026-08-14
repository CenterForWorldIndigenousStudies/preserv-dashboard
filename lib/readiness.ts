export const REQUIRED_READINESS_FIELDS = [
  'dc_title',
  'dc_date',
  'dc_type',
  'dc_language_iso',
  'dc_description_abstract',
  'dc_rights',
  'dc_subject',
] as const

export const READINESS_ACCESS_REQUIREMENT = 'access_level'

export interface ReadinessReasonGroup {
  serviceKey: string
  reasons: string[]
}

export interface ReadinessEvaluation {
  approved: boolean
  unmetRequirements: string[]
  reasonGroups: ReadinessReasonGroup[]
}

type ReadinessMetadata = Record<string, unknown>

export function projectCandidateMetadata({
  metadata,
  validatedFields,
}: {
  metadata: ReadinessMetadata
  validatedFields: ReadinessMetadata
}): ReadinessMetadata {
  const projected = { ...metadata }
  const subject = unwrapValue(metadata.dc_subject_unesco)
  if (hasValue(subject) && isValidated(validatedFields.dc_subject_unesco)) {
    projected.dc_subject = subject
  }
  return projected
}

export function evaluateCandidateReadiness({
  metadata,
  validatedFields,
  accessLevels,
}: {
  metadata: ReadinessMetadata
  validatedFields: ReadinessMetadata
  accessLevels: readonly string[]
}): ReadinessEvaluation {
  const unmetRequirements: string[] = []
  const reasons: string[] = []

  for (const field of REQUIRED_READINESS_FIELDS) {
    const sourceField = field === 'dc_subject' ? 'dc_subject_unesco' : field
    const value = unwrapValue(metadata[sourceField])
    if (!hasValue(value)) {
      unmetRequirements.push(field)
      reasons.push(`Missing required metadata: ${field}.`)
    } else if (!isValidated(validatedFields[sourceField])) {
      unmetRequirements.push(field)
      reasons.push(`Required metadata failed validation: ${field}.`)
    }
  }

  if (!accessLevels.some((level) => level.trim())) {
    unmetRequirements.push(READINESS_ACCESS_REQUIREMENT)
    reasons.push('At least one access level is required.')
  }

  return {
    approved: unmetRequirements.length === 0,
    unmetRequirements,
    reasonGroups: reasons.length > 0 ? [{ serviceKey: 'readiness', reasons }] : [],
  }
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function isValidated(value: unknown): boolean {
  if (value === null || value === undefined || value === true) return true
  if (value === false) return false
  const unwrappedValue = unwrapValue(value)
  if (typeof unwrappedValue === 'boolean') return unwrappedValue
  if (typeof unwrappedValue === 'string') {
    return !['failed', 'invalid', 'rejected', 'error', 'needs_review'].includes(
      unwrappedValue.trim().toLowerCase(),
    )
  }
  if (typeof unwrappedValue === 'object' && unwrappedValue !== null) {
    const record = unwrappedValue as Record<string, unknown>
    for (const key of ['valid', 'is_valid', 'passed']) {
      if (key in record) return isValidated(record[key])
    }
    return 'status' in record ? isValidated(record.status) : true
  }
  return true
}

function unwrapValue(value: unknown): unknown {
  let current = value
  while (
    typeof current === 'object' &&
    current !== null &&
    !Array.isArray(current) &&
    Object.keys(current).length === 1 &&
    'value' in current
  ) {
    current = current.value
  }
  return current
}
