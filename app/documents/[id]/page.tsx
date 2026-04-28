import Link from 'next/link'
import type { ReactElement } from 'react'
import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { AuditHistoryTable } from '@organisms/AuditHistoryTable'
import { DocumentVersionsButton } from '@organisms/DocumentVersionsButton'
import { ReviewHistoryTable } from '@organisms/ReviewHistoryTable'
import { parseMetadataValue } from '@lib/format'
import { getDocumentDetail } from '@lib/queries'

export const dynamic = 'force-dynamic'

interface DocumentDetailPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function resolveOverviewHref(searchParams: Record<string, string | string[] | undefined>): string {
  const from = firstSearchParam(searchParams.from)
  if (from && from.startsWith('/')) {
    return from
  }
  return '/'
}

const documentFieldLabels: Array<{ key: string; label: string }> = [
  { key: 'id', label: 'Document ID' },
  { key: 'name', label: 'Name' },
  { key: 'id_legacy', label: 'Legacy ID' },
  { key: 'filesize', label: 'File Size' },
  { key: 'hash_binary', label: 'Hash (Binary)' },
  { key: 'hash_content', label: 'Hash (Content)' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
]

const detailTableClassName = 'min-w-full border-separate border-spacing-0 text-left text-sm text-ink'
const detailTableHeadCellClassName = 'bg-[#f4f1eb] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink'
const detailTableBodyCellClassName = 'border-b border-moss/10 px-3 py-3 align-top'

export default async function DocumentDetailPage({
  params,
  searchParams,
}: DocumentDetailPageProps): Promise<ReactElement> {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const overviewHref = resolveOverviewHref(resolvedSearchParams)

  try {
    const detail = await getDocumentDetail(id)

    if (!detail) {
      return (
        <div className="space-y-8">
          <PageHeader
            eyebrow="Document Detail"
            title="No Data"
            description="Inspect the full document record, metadata payload, audit trail, review history, and duplicate relationships."
          />
          <Link
            href={overviewHref}
            className="inline-flex text-sm font-medium text-moss transition hover:text-moss/80"
          >
            ← Back to Overview
          </Link>
          <NoDataState message="No document data is available for this record yet." />
        </div>
      )
    }

    const { document, audits, reviews } = detail

    const documentFieldValues = {
      id: document.id,
      name: document.name ?? '—',
      id_legacy: document.id_legacy ?? '—',
      filesize: document.filesize,
      hash_binary: document.hash_binary ?? '—',
      hash_content: document.hash_content ?? '—',
      created_at: document.created_at,
      updated_at: document.updated_at,
    } as Record<string, string | bigint | number | null | undefined>

    return (
      <div className="space-y-8">
        <Link
          href={overviewHref}
          className="inline-flex text-sm font-medium text-moss transition hover:text-moss/80"
        >
          ← Back to Overview
        </Link>
        <PageHeader
          eyebrow="Document Detail"
          title={document.name || document.id}
          description="Inspect the full document record, metadata payload, audit trail, review history, and duplicate relationships."
        />

        <section className="grid gap-8 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-ink">Document Fields</h2>
            <dl className="mt-6 grid gap-x-6 gap-y-4 md:grid-cols-2">
              {documentFieldLabels.map((field) => (
                <div key={field.key} className="rounded-xl bg-sand/45 p-4">
                  <dt className="text-xs uppercase tracking-[0.15em] text-ink/60">{field.label}</dt>
                  <dd className="mt-2 break-words text-sm text-ink">
                    {field.key === 'filesize' ? (
                      <FileSize value={documentFieldValues.filesize as bigint | number | null | undefined} />
                    ) : field.key === 'created_at' || field.key === 'updated_at' ? (
                      <DateAtom value={documentFieldValues[field.key] as string | Date | null | undefined} />
                    ) : (
                      documentFieldValues[field.key] || '—'
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Versions</h2>
                  <p className="mt-2 text-sm text-ink/60">
                    Open the related document versions and duplicates for this record.
                  </p>
                </div>
                {detail.version_family ? <DocumentVersionsButton versionFamily={detail.version_family} /> : null}
              </div>
              {!detail.version_family && detail.document.is_duplicate ? (
                <p className="mt-4 text-sm text-ink/60">
                  This document is tagged as a duplicate, but the current registry data did not include a version
                  group or duplicate family for it. The overview can flag it as duplicate, but the related duplicate
                  set is not available to display here yet.
                </p>
              ) : null}
              {!detail.version_family && !detail.document.is_duplicate ? (
                <p className="mt-4 text-sm text-ink/60">No related versions available.</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
              <h2 className="text-xl font-semibold text-ink">Metadata</h2>
              {detail.metadata.length > 0 ? (
                <div className="mt-6 overflow-x-auto">
                  <table className={detailTableClassName}>
                    <thead>
                      <tr>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          Field
                        </th>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.metadata.map((field, i) => (
                        <tr key={i}>
                          <td className={`${detailTableBodyCellClassName} font-medium`}>{field.name}</td>
                          <td className={detailTableBodyCellClassName}>
                            {(() => {
                              const parsed = parseMetadataValue(field.value, field.value_type)
                              return parsed.display
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink/60">No metadata available.</p>
              )}
            </div>

            <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
              <h2 className="text-xl font-semibold text-ink">Tags</h2>
              {detail.document_to_tags.length > 0 ? (
                <div className="mt-6 overflow-x-auto">
                  <table className={detailTableClassName}>
                    <thead>
                      <tr>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          Tag
                        </th>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.document_to_tags.map((dt, i) => (
                        <tr key={i}>
                          <td className={`${detailTableBodyCellClassName} font-medium`}>
                            {dt.tags.name ? (
                              <span className="cursor-help" title={dt.tags.notes ?? undefined}>
                                {dt.tags.name}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={detailTableBodyCellClassName}>{dt.notes || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink/60">No tags available.</p>
              )}
            </div>

            <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
              <h2 className="text-xl font-semibold text-ink">Batches</h2>
              {detail.document_to_batches.length > 0 ? (
                <div className="mt-6 overflow-x-auto">
                  <table className={detailTableClassName}>
                    <thead>
                      <tr>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          Batch ID
                        </th>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          Batch Origin
                        </th>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          Processing Time
                        </th>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          OCR Low
                        </th>
                        <th className={`${detailTableHeadCellClassName} border-b-2 border-[#5e7a52]`} scope="col">
                          OCR Medium
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.document_to_batches.map((batchLink) => (
                        <tr key={batchLink.id}>
                          <td className={`${detailTableBodyCellClassName} font-medium`}>
                            {batchLink.batch_legacy_id ?? batchLink.batch_id}
                          </td>
                          <td className={detailTableBodyCellClassName}>{batchLink.batch_origin ?? '—'}</td>
                          <td className={detailTableBodyCellClassName}>
                            {batchLink.processing_time_seconds ?? '—'}
                          </td>
                          <td className={detailTableBodyCellClassName}>
                            {batchLink.ocr_quality_low ? 'True' : 'False'}
                          </td>
                          <td className={detailTableBodyCellClassName}>
                            {batchLink.ocr_quality_medium ? 'True' : 'False'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink/60">No batch links available.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-ink">Audit History</h2>
            <div className="mt-6">
              <AuditHistoryTable audits={audits} />
            </div>
          </div>

          <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-ink">Review History</h2>
            <div className="mt-6">
              <ReviewHistoryTable reviews={reviews} />
            </div>
          </div>
        </section>
      </div>
    )
  } catch {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Document Detail"
          title="No Data"
          description="Inspect the full document record, metadata payload, audit trail, review history, and duplicate relationships."
        />
        <NoDataState message="No data is available right now. The database may be empty, unavailable, or still being initialized." />
      </div>
    )
  }
}
