const DEFAULT_CHILD_PAGE_SIZE = 200
const DEFAULT_ROOT_FOLDER_ID = 'root-folder-default'

function parseAllowedEditorEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean)
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
  const rootFolderId =
    process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID?.trim() ||
    DEFAULT_ROOT_FOLDER_ID
  const allowedEditorEmails = parseAllowedEditorEmails(
    process.env.EXCLUSION_REVIEW_ALLOWED_EMAILS,
  )
  const parsedChildPageSize = Number(
    process.env.EXCLUSION_REVIEW_CHILDREN_PAGE_SIZE || DEFAULT_CHILD_PAGE_SIZE,
  )

  return {
    rootFolderId,
    allowedEditorEmails,
    childPageSize:
      Number.isInteger(parsedChildPageSize) && parsedChildPageSize > 0
        ? parsedChildPageSize
        : DEFAULT_CHILD_PAGE_SIZE,
  }
}
