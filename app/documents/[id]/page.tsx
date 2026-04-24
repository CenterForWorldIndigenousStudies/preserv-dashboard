import type { ReactElement } from 'react'
import { DateAtom } from '@atoms/Date'
import { StateBadge } from '@atoms/StateBadge'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { formatBytes, parseMetadataValue } from '@lib/format'
import { getDocumentDetail } from '@lib/queries'

export const dynamic = 'force-dynamic'

interface DocumentDetailPageProps {
  params: Promise<{
    id: string
  }>
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

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps): Promise<ReactElement> {
  const { id } = await params

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
          <NoDataState message="No document data is available for this record yet." />
        </div>
      )
    }

    const { document, audits, reviews } = detail

    const documentFieldValues = {
      id: document.id,
      name: document.name ?? '—',
      id_legacy: document.id_legacy ?? '—',
      filesize: formatBytes(document.filesize),
      hash_binary: document.hash_binary ?? '—',
      hash_content: document.hash_content ?? '—',
    } as Record<string, string>

    return (
      <div className="space-y-8">
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
                  <dd className="mt-2 break-words text-sm text-ink">{documentFieldValues[field.key] || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-8">
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
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-ink">Audit History</h2>
            <div className="mt-6 space-y-4">
              {audits.length === 0 ? (
                <p className="text-sm text-ink/65">No audit entries found.</p>
              ) : (
                audits.map((audit, index) => (
                  <div
                    key={`${audit.document_id}-${audit.field_name}-${index}`}
                    className="rounded-xl border border-moss/10 bg-sand/45 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{audit.field_name}</p>
                      <p className="text-xs uppercase tracking-[0.15em] text-ink/55">
                        {audit.source_name} • <DateAtom value={audit.changed_at} />
                      </p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-ink/55">Before</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{audit.before_value || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-ink/55">After</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{audit.after_value || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-ink">Review History</h2>
            <div className="mt-6 space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-ink/65">No review items found for this document.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-moss/10 bg-sand/45 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{review.field_name}</p>
                      <StateBadge state={review.status} />
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.15em] text-ink/55">
                      Winning Source: {review.winning_source || '—'} • <DateAtom value={review.created_at} />
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-ink/55">Winning Value</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{review.winning_value || '—'}</p>
                      </div>
                      <div className="rounded-xl bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-ink/55">Conflicts</p>
                        <div className="mt-2 space-y-2 text-sm text-ink">
                          {review.conflicting_values.length === 0 ? (
                            <p>—</p>
                          ) : (
                            review.conflicting_values.map((conflictValue, index) => (
                              <div key={`${review.id}-${index}`}>
                                <p className="font-medium">{conflictValue.source}</p>
                                <p className="whitespace-pre-wrap">{conflictValue.value || '—'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
