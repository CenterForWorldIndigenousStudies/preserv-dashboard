export type DocumentSourceLinkType = 'drive' | 'google-docs' | 'google-slides' | 'google-sheets'

export interface DocumentSourceLinkOptions {
  fileExtension?: string | null
  fileName?: string | null
  mimeType?: string | null
}

const WORD_EXTENSIONS = new Set(['doc', 'docx'])
const POWERPOINT_EXTENSIONS = new Set(['ppt', 'pptx'])
const SPREADSHEET_EXTENSIONS = new Set(['xls', 'xlsx'])
const WORD_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const POWERPOINT_MIME_TYPES = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])
const SPREADSHEET_MIME_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

function normalizeExtension(extension: string | null | undefined): string | null {
  const normalized = extension?.trim().toLowerCase().replace(/^\./, '')
  return normalized || null
}

function extensionFromFileName(fileName: string | null | undefined): string | null {
  const normalized = fileName?.trim().toLowerCase()
  if (!normalized) return null

  const extension = normalized.split('.').pop()
  return extension && extension !== normalized ? extension : null
}

export function getDocumentSourceLinkType(options: DocumentSourceLinkOptions = {}): DocumentSourceLinkType {
  const extension = normalizeExtension(options.fileExtension) ?? extensionFromFileName(options.fileName)
  const mimeType = options.mimeType?.trim().toLowerCase()

  if (WORD_EXTENSIONS.has(extension ?? '') || WORD_MIME_TYPES.has(mimeType ?? '')) {
    return 'google-docs'
  }

  if (POWERPOINT_EXTENSIONS.has(extension ?? '') || POWERPOINT_MIME_TYPES.has(mimeType ?? '')) {
    return 'google-slides'
  }

  if (SPREADSHEET_EXTENSIONS.has(extension ?? '') || SPREADSHEET_MIME_TYPES.has(mimeType ?? '')) {
    return 'google-sheets'
  }

  return 'drive'
}

export function getDocumentSourceUrl(sourceId: string, options: DocumentSourceLinkOptions = {}): string {
  const linkType = getDocumentSourceLinkType(options)

  if (linkType === 'google-docs') {
    return `https://docs.google.com/document/d/${sourceId}`
  }

  if (linkType === 'google-slides') {
    return `https://docs.google.com/presentation/d/${sourceId}`
  }

  if (linkType === 'google-sheets') {
    return `https://docs.google.com/spreadsheets/d/${sourceId}`
  }

  return `https://drive.google.com/file/d/${sourceId}/view`
}
