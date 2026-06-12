import type { ReactElement, ReactNode } from 'react'

import { DateAtom } from '@atoms/Date'
import { SourceFolderId } from '@atoms/SourceFolderId'
import { SourceId } from '@atoms/SourceId'
import { parseMetadataValue } from '@lib/metadata'
import type { DocumentDetail, DocumentMetadataField } from 'types/documents'

const lineageCardClassName = 'rounded-2xl border border-moss/15 bg-white p-6 shadow-panel'
const metadataTableClassName = 'min-w-full border-separate border-spacing-0 text-left text-sm text-ink'
const metadataTableHeadCellClassName =
  'bg-[#f4f1eb] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink'
const metadataTableBodyCellClassName = 'border-b border-moss/10 px-3 py-3 align-top'

const provenanceMetadataKeys = new Set([
  'content_dedup_text_source_id',
  'content_hash_timestamp',
  'fedora_csv_source_id',
  'fedora_publication_source_document_id',
  'ocr_source_document_id',
  'ocr_source_document_name',
  'ocr_version_document_id',
  'origin_parent_name',
  'origin_parent_source_id',
  'origin_source_id',
  'origin_url',
  'rotation_source_document_id',
  'rotation_source_document_name',
  'source_created_at',
  'source_folder_id',
  'source_id',
  'source_updated_at',
  'split_parent_document_id',
  'split_parent_document_name',
])

function renderMetadataValue(field: DocumentMetadataField): ReactNode {
  const parsed = parseMetadataValue(field.value, field.value_type)

  if (
    [
      'content_dedup_text_source_id',
      'fedora_csv_source_id',
      'fedora_publication_source_document_id',
      'ocr_source_document_id',
      'ocr_version_document_id',
      'origin_source_id',
      'rotation_source_document_id',
      'source_id',
      'split_parent_document_id',
    ].includes(field.name)
  ) {
    return <SourceId value={parsed.display as string} />
  }

  if (['origin_parent_source_id', 'source_folder_id'].includes(field.name)) {
    return <SourceFolderId value={parsed.display as string} />
  }

  if (['content_hash_timestamp', 'source_created_at', 'source_updated_at'].includes(field.name)) {
    return <DateAtom value={parsed.display as number | string} />
  }

  return parsed.display
}

function getCurrentDocumentStatus(detail: DocumentDetail): string | null {
  if (detail.version_family?.canonical_document_id === detail.document.id) {
    return 'Canonical document'
  }

  if (detail.document.is_duplicate) {
    return 'Duplicate document'
  }

  if (detail.version_family) {
    return 'Related document'
  }

  return null
}

export function DocumentLineageSection({ detail }: { detail: DocumentDetail }): ReactElement {
  const recordedSourceMetadata = detail.metadata.filter((field) => provenanceMetadataKeys.has(field.name))
  const batchLinks = detail.document_to_batches.filter(
    (batchLink) => batchLink.batch_name !== null || batchLink.batch_origin !== null || batchLink.added_at !== null,
  )
  const currentDocumentStatus = getCurrentDocumentStatus(detail)
  const hasSignals =
    detail.version_family !== null ||
    currentDocumentStatus !== null ||
    recordedSourceMetadata.length > 0 ||
    batchLinks.length > 0

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Lineage and Provenance</h2>
        <p className="mt-2 text-sm text-ink/60">
          Review related version family details, recorded source metadata, and batch links that are already stored for
          this document.
        </p>
      </div>

      {!hasSignals ? (
        <div className={lineageCardClassName}>
          <p className="text-sm text-ink/60">No lineage or provenance details are available for this document.</p>
        </div>
      ) : null}

      {detail.version_family !== null || currentDocumentStatus !== null ? (
        <div className={lineageCardClassName}>
          <h3 className="text-lg font-semibold text-ink">Related version family</h3>
          <dl className="mt-6 grid gap-x-6 gap-y-4 md:grid-cols-2">
            {currentDocumentStatus !== null ? (
              <div className="rounded-xl bg-sand/45 p-4">
                <dt className="text-xs uppercase tracking-[0.15em] text-ink/60">Current document status</dt>
                <dd className="mt-2 break-words text-sm text-ink">{currentDocumentStatus}</dd>
              </div>
            ) : null}

            {detail.version_family !== null ? (
              <>
                <div className="rounded-xl bg-sand/45 p-4">
                  <dt className="text-xs uppercase tracking-[0.15em] text-ink/60">Canonical document ID</dt>
                  <dd className="mt-2 break-words text-sm text-ink">{detail.version_family.canonical_document_id}</dd>
                </div>
                <div className="rounded-xl bg-sand/45 p-4">
                  <dt className="text-xs uppercase tracking-[0.15em] text-ink/60">Related documents</dt>
                  <dd className="mt-2 break-words text-sm text-ink">{detail.version_family.documents.length}</dd>
                </div>
              </>
            ) : null}
          </dl>

          {detail.version_family === null && detail.document.is_duplicate ? (
            <p className="mt-4 text-sm text-ink/60">
              A duplicate document tag is recorded for this document, but no related version family is available to
              display.
            </p>
          ) : null}
        </div>
      ) : null}

      {recordedSourceMetadata.length > 0 ? (
        <div className={lineageCardClassName}>
          <h3 className="text-lg font-semibold text-ink">Recorded source metadata</h3>
          <div className="mt-6 overflow-x-auto">
            <table className={metadataTableClassName}>
              <thead>
                <tr>
                  <th className={`${metadataTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                    Field
                  </th>
                  <th className={`${metadataTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {recordedSourceMetadata.map((field) => (
                  <tr key={field.name}>
                    <td className={`${metadataTableBodyCellClassName} font-medium`}>{field.name}</td>
                    <td className={metadataTableBodyCellClassName}>{renderMetadataValue(field)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {batchLinks.length > 0 ? (
        <div className={lineageCardClassName}>
          <h3 className="text-lg font-semibold text-ink">Batch links</h3>
          <div className="mt-6 overflow-x-auto">
            <table className={metadataTableClassName}>
              <thead>
                <tr>
                  <th className={`${metadataTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                    Batch name
                  </th>
                  <th className={`${metadataTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                    Batch origin
                  </th>
                  <th className={`${metadataTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                    Added at
                  </th>
                </tr>
              </thead>
              <tbody>
                {batchLinks.map((batchLink) => (
                  <tr key={batchLink.id}>
                    <td className={`${metadataTableBodyCellClassName} font-medium`}>{batchLink.batch_name ?? '—'}</td>
                    <td className={metadataTableBodyCellClassName}>{batchLink.batch_origin ?? '—'}</td>
                    <td className={metadataTableBodyCellClassName}>
                      <DateAtom value={batchLink.added_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
