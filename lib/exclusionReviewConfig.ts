const DEFAULT_CHILD_PAGE_SIZE = 200
export const EXCLUSION_REVIEW_CONFIGURATION_ERROR_CODE = 'EXCLUSION_REVIEW_CONFIGURATION_ERROR'
const MISSING_ROOT_FOLDER_MESSAGE = 'EXCLUSION_REVIEW_ROOT_FOLDER_ID is required for the Exclusion Review workspace.'

export class ExclusionReviewConfigurationError extends Error {
  readonly code = EXCLUSION_REVIEW_CONFIGURATION_ERROR_CODE

  constructor(message: string) {
    super(message)
    this.name = 'ExclusionReviewConfigurationError'
  }
}

function parseAllowedEditorEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export function getExclusionReviewConfig(): {
  rootFolderId: string
  allowedEditorEmails: string[]
  childPageSize: number
} {
  const rootFolderId = process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID?.trim()
  if (!rootFolderId) {
    throw new ExclusionReviewConfigurationError(MISSING_ROOT_FOLDER_MESSAGE)
  }
  const allowedEditorEmails = parseAllowedEditorEmails(process.env.EXCLUSION_REVIEW_ALLOWED_EMAILS)
  const parsedChildPageSize = Number(process.env.EXCLUSION_REVIEW_CHILDREN_PAGE_SIZE || DEFAULT_CHILD_PAGE_SIZE)

  return {
    rootFolderId,
    allowedEditorEmails,
    childPageSize:
      Number.isInteger(parsedChildPageSize) && parsedChildPageSize > 0 ? parsedChildPageSize : DEFAULT_CHILD_PAGE_SIZE,
  }
}
