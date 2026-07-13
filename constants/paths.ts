export const API_PATH = '/api' as const

export const AUTH_PATH = `/auth` as const
export const SIGNIN_PATH = `${AUTH_PATH}/signin` as const
export const AUTH_ERROR_PATH = `${AUTH_PATH}/error` as const

export const BATCHES_PATH = '/batches' as const

export const COLLECTIONS_PATH = `/collections` as const

export const COMPONENT_LIBRARY_PATH = '/component-library' as const

export const DASHBOARD_PATH = '/dashboard' as const

export const DB_SCHEMA_PATH = '/db' as const

export const DOCUMENTS_API_PATH = `${API_PATH}/documents` as const
export const DOCUMENTS_PATH = '/documents' as const
export const getDocumentCollectionsPath = (documentId: string): string =>
  `${DOCUMENTS_API_PATH}/${encodeURIComponent(documentId)}/collections`

export const FAILED_PATH = `/failures` as const

export const PIPELINE_PATH = `${API_PATH}/pipeline` as const
export const DATA_INGESTER_CALLBACK_PATH = `${PIPELINE_PATH}/ingester/callback` as const
export const DOCUMENT_SPLITTER_CALLBACK_PATH = `${PIPELINE_PATH}/document-splitter/callback` as const
export const PAGE_ROTATOR_CALLBACK_PATH = `${PIPELINE_PATH}/page-rotator/callback` as const
export const OCR_PROCESSOR_CALLBACK_PATH = `${PIPELINE_PATH}/ocr-processor/callback` as const
export const CONTENT_DEDUP_CALLBACK_PATH = `${PIPELINE_PATH}/content-dedup/callback` as const
export const METADATA_EXTRACTOR_CALLBACK_PATH = `${PIPELINE_PATH}/metadata-extractor/callback` as const
export const METADATA_VALIDATOR_CALLBACK_PATH = `${PIPELINE_PATH}/metadata-validator/callback` as const
export const RIGHTS_DETERMINATOR_CALLBACK_PATH = `${PIPELINE_PATH}/rights-determinator/callback` as const

export const PROCESS_PATH = `${API_PATH}/process` as const
export const PROCESS_EVENTS_PATH = `${PROCESS_PATH}/events` as const
export const PROCESS_FOLDERS_PATH = `${PROCESS_PATH}/folders` as const
export const PROCESS_START_PATH = `${PROCESS_PATH}/start` as const

export const PROCESS_DOCUMENTS_PATH = `/process-documents` as const

export const READY_FOR_LIBRARY_PATH = '/ready-for-library' as const

export const REVIEW_QUEUE_PATH = '/review-queue' as const

export const REPORTS_PAGE_PATH = '/reports' as const

export const TAGS_PATH = `${API_PATH}/tags` as const
export const TAGS_PAGE_PATH = '/tags' as const
export const TAG_SEARCH_PATH = `${TAGS_PATH}/search` as const

export const getDocumentTagsPath = (documentId: string): string =>
  `${DOCUMENTS_API_PATH}/${encodeURIComponent(documentId)}${TAGS_PAGE_PATH}`
