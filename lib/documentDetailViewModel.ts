import { getBatchDetailPath } from '@constants/paths'
import { parseCommentPipelineEvents } from '@lib/commentPipeline'
import type { PipelineDiagnosticEvent, PipelineEventBatchLink } from 'types/commentPipeline'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

export interface DocumentStageMetadataGroup {
  title: string
  fields: MetadataField[]
}

const contentDedupSourceMetadataKeys = new Set(['content_dedup_text_source_id'])

const fedoraSourceMetadataKeys = new Set([
  'fedora_csv_source_id',
  'fedora_publication_source_document_id',
  'fedora_url',
])

const ocrSourceMetadataKeys = new Set([
  'ocr_metadata_source_file',
  'ocr_source_document_id',
  'ocr_source_document_name',
])

const originSourceMetadataKeys = new Set([
  'folder_context',
  'origin_parent_name',
  'origin_parent_source_id',
  'origin_source_id',
  'origin_url',
  'original_filename',
])

const rotatorSourceMetadataKeys = new Set(['rotation_source_document_id', 'rotation_source_document_name'])

const sourceMetadataKeys = new Set([
  'source_created_at',
  'source_folder_id',
  'source_folder_structure',
  'source_id',
  'source_updated_at',
])

const splitterSourceMetadataKeys = new Set(['split_parent_document_id', 'split_parent_document_name'])

export const recordedSourceMetadataKeys = new Set([
  ...contentDedupSourceMetadataKeys,
  ...fedoraSourceMetadataKeys,
  ...ocrSourceMetadataKeys,
  ...originSourceMetadataKeys,
  ...rotatorSourceMetadataKeys,
  ...sourceMetadataKeys,
  ...splitterSourceMetadataKeys,
])

const documentPropertyMetadataKeys = new Set([
  'character_count',
  'content_hash_algorithm',
  'file_extension',
  'legacy_file_size_origin',
  'legacy_format_origin',
  'mime_type',
])

const documentToolbarMetadataKeys = new Set(['binary_hash', 'needs_review', 'preservation_candidate'])

const documentSplitterMetadataKeys = new Set([
  'document_boundary_split_applied',
  'document_splitter_pass',
  'logical_page_end',
  'logical_page_start',
  'page_split_applied',
  'split_index',
  'split_operation_mode',
])

const pageRotatorMetadataKeys = new Set([
  'deskew_degrees',
  'page_rotator_deskew_degrees',
  'page_rotator_normalization_mode',
  'page_rotator_output_mode',
  'page_rotator_pass',
  'page_rotator_processed',
  'page_rotator_reason',
  'page_rotator_rotation_degrees',
  'page_rotator_page_rotations',
  'page_rotations',
  'pages_rotated',
  'rotation_degrees',
  'rotation_mode',
])

const ocrProcessorMetadataKeys = new Set([
  'ocr_generated',
  'ocr_page_count',
  'ocr_source_pdf_origin',
  'ocr_strategy',
  'ocr_text_url',
  'ocr_version_document_id',
])

const contentDedupMetadataKeys = new Set(['content_hash_timestamp'])
const commentPipelineMetadataName = 'comment_pipeline'

const commentFieldDefinitions = [
  { name: 'comment', displayName: 'Comment' },
  { name: 'comment_additional', displayName: 'Additional Comment' },
  { name: 'comments_additional', displayName: 'Additional Comments' },
  { name: 'comments_control', displayName: 'Control Comments' },
  { name: 'comments_general', displayName: 'General Comments' },
  { name: 'comment_validation', displayName: 'Validation Comment' },
  { name: 'comment_validation_additional', displayName: 'Additional Validation Comment' },
] as const

const commentMetadataNames = new Set([...commentFieldDefinitions.map((field) => field.name), 'comment_control'])

const stageMetadataGroups = [
  { title: 'Document Splitter', keys: documentSplitterMetadataKeys },
  { title: 'Page Rotator', keys: pageRotatorMetadataKeys },
  { title: 'OCR Processor', keys: ocrProcessorMetadataKeys },
  { title: 'Content Deduplication', keys: contentDedupMetadataKeys },
] as const

const stageMetadataFieldNames = new Set(stageMetadataGroups.flatMap((group) => Array.from(group.keys)))

export function buildDisplayedMetadata(metadata: MetadataField[]): MetadataField[] {
  return metadata.filter(
    (field) =>
      !recordedSourceMetadataKeys.has(field.name) &&
      !documentPropertyMetadataKeys.has(field.name) &&
      !documentToolbarMetadataKeys.has(field.name) &&
      !stageMetadataFieldNames.has(field.name) &&
      field.name !== 'collection' &&
      field.name !== commentPipelineMetadataName &&
      !commentMetadataNames.has(field.name),
  )
}

export function buildStageMetadata(metadata: MetadataField[]): DocumentStageMetadataGroup[] {
  return stageMetadataGroups
    .map((group) => ({
      title: group.title,
      fields: metadata.filter((field) => group.keys.has(field.name)),
    }))
    .filter((group) => group.fields.length > 0)
}

export function buildCommentFields(metadata: MetadataField[], quality: DocumentDetail['quality']): MetadataField[] {
  const metadataByName = new Map(metadata.map((field) => [field.name, field]))

  return commentFieldDefinitions.map(({ name, displayName }) => {
    if (name === 'comment' || name === 'comment_additional') {
      const value = name === 'comment' ? quality?.comment : quality?.comment_additional
      return {
        name,
        displayName,
        value: value ? JSON.stringify({ value }) : '',
        value_type: 'string',
        notes: null,
      }
    }

    const field = metadataByName.get(name)
    return field ? { ...field, displayName } : { name, displayName, value: '', value_type: 'string', notes: null }
  })
}

export interface DocumentPipelineDiagnostics {
  events: PipelineDiagnosticEvent[]
  batchLinks: Record<string, PipelineEventBatchLink>
  diagnosticsHref?: string
}

export function buildPipelineDiagnostics(
  detail: DocumentDetail,
  metadata: MetadataField[],
  currentDocumentHref: string,
): DocumentPipelineDiagnostics {
  const commentPipelineField = metadata.find((field) => field.name === commentPipelineMetadataName)
  const events = commentPipelineField
    ? parseCommentPipelineEvents(commentPipelineField.value, commentPipelineField.value_type)
    : []
  const documentName = detail.document.name?.trim() || detail.document.id

  const batchLinks = Object.fromEntries(
    detail.document_to_batches.map((batch) => [
      batch.batch_id,
      {
        name: batch.batch_name?.trim() || batch.batch_legacy_id || batch.batch_id,
        href: getBatchDetailPath(batch.batch_id, currentDocumentHref, `document ${documentName}`),
      },
    ]),
  )

  return {
    events,
    batchLinks,
    diagnosticsHref: events.length > 0 ? '#processing-diagnostics' : undefined,
  }
}
