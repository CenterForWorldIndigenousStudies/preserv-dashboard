import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'

export type DocumentEditWarning = 'approved' | 'published'

interface DocumentEditWarningInput {
  validationStatus: string | null | undefined
  hasPublishedBatch: boolean
  latestState?: string | null
}

export function getDocumentEditWarning({
  validationStatus,
  hasPublishedBatch,
  latestState,
}: DocumentEditWarningInput): DocumentEditWarning | null {
  if (hasPublishedBatch || latestState?.trim().toLowerCase() === GENERATED_DOCUMENT_STATES.INGESTED_FEDORA)
    return 'published'
  return validationStatus?.trim().toUpperCase() === 'APPROVED' ? 'approved' : null
}
