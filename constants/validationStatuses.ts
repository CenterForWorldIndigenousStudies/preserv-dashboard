import type { document_quality_validation_status as PrismaValidationStatus } from '@lib/prisma/generated/client'

// Keep these values aligned with src/preserv_pipeline/data_combiner/utils/inventory/document_quality_from_inventory.py.
export const VALIDATION_STATUS_OPTIONS = [
  'VALIDATED',
  'APPROVED',
  'FORMAT_ERRORS',
  'METADATA_ISSUES',
  'NEEDS_REVIEW',
  'GENERAL_ERRORS',
  'REJECTED',
] as const satisfies readonly PrismaValidationStatus[]

export type ValidationStatusOption = (typeof VALIDATION_STATUS_OPTIONS)[number]
