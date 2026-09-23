import type { document_quality_validation_status as PrismaValidationStatus } from '@lib/prisma/generated/client'

// Keep these values aligned with src/preserv_pipeline/data_combiner/utils/inventory/document_quality_from_inventory.py.
export const VALIDATION_STATUSES = {
  VALIDATED: 'VALIDATED',
  APPROVED: 'APPROVED',
  FORMAT_ERRORS: 'FORMAT_ERRORS',
  METADATA_ISSUES: 'METADATA_ISSUES',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  GENERAL_ERRORS: 'GENERAL_ERRORS',
  REJECTED: 'REJECTED',
} as const satisfies Record<string, PrismaValidationStatus>

export const VALIDATION_STATUS_OPTIONS = [
  VALIDATION_STATUSES.VALIDATED,
  VALIDATION_STATUSES.APPROVED,
  VALIDATION_STATUSES.FORMAT_ERRORS,
  VALIDATION_STATUSES.METADATA_ISSUES,
  VALIDATION_STATUSES.NEEDS_REVIEW,
  VALIDATION_STATUSES.GENERAL_ERRORS,
  VALIDATION_STATUSES.REJECTED,
] as const satisfies readonly PrismaValidationStatus[]

export type ValidationStatusOption = (typeof VALIDATION_STATUS_OPTIONS)[number]
