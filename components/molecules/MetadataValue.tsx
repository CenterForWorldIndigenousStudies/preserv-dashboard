import type { ReactElement } from 'react'

import { Cost } from '@atoms/Cost'
import { DateAtom } from '@atoms/Date'
import { SourceFolderId } from '@atoms/SourceFolderId'
import { SourceId } from '@atoms/SourceId'
import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import { ValuePillList } from '@molecules/ValuePillList'
import { parseMetadataList, parseMetadataValue } from '@lib/metadata'
import type { MetadataField } from 'types/metadata'

const metadataPillFieldNames = new Set([
  'dc_coverage_cultural',
  'dc_subject',
  'dc_subject_unesco',
  'long_tail_keywords',
  'seo_keywords',
])

const sourceIdFieldNames = new Set([
  'content_dedup_text_source_id',
  'fedora_csv_source_id',
  'fedora_publication_source_document_id',
  'ocr_source_document_id',
  'ocr_version_document_id',
  'origin_source_id',
  'rotation_source_document_id',
  'source_id',
  'split_parent_document_id',
])

const sourceFolderIdFieldNames = new Set(['source_folder_id', 'origin_parent_source_id'])

const dateFieldNames = new Set([
  'binary_processing_datetime',
  'content_hash_timestamp',
  'discrepancy_correction_timestamp',
  'duplicates_removed_timestamp',
  'source_created_at',
  'source_updated_at',
])

const costFieldNames = new Set(['cost_saved'])

export interface MetadataValueProps {
  field: MetadataField
}

export function MetadataValue({ field }: MetadataValueProps): ReactElement {
  if (field.name === 'needs_review') {
    return <NeedsReviewReasons value={field.value} />
  }

  if (metadataPillFieldNames.has(field.name)) {
    return <ValuePillList values={parseMetadataList(field.value, field.value_type)} emptyMessage={'—'} />
  }

  const parsed = parseMetadataValue(field.value, field.value_type)

  if (sourceIdFieldNames.has(field.name)) {
    return <SourceId value={parsed.display as string} />
  }

  if (sourceFolderIdFieldNames.has(field.name)) {
    return <SourceFolderId value={parsed.display as string} />
  }

  if (dateFieldNames.has(field.name)) {
    return <DateAtom value={parsed.display as number} />
  }

  if (costFieldNames.has(field.name)) {
    return <Cost value={parsed.display} />
  }

  return <>{parsed.display}</>
}
