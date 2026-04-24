import type { ReactElement } from 'react'
import Link from 'next/link'

import { DateAtom } from '@atoms/Date'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { getFailures } from '@lib/queries'

export const dynamic = 'force-dynamic'

export default async function FailuresPage(): Promise<ReactElement> {
  try {
    const failures = await getFailures()

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Processing Failures"
          title="Inspect documents that did not complete processing."
          description="Failed documents are sorted by ingestion time. Failure reasons are derived from metadata when an error-like field is present."
        />

        {failures.length === 0 ? (
          <NoDataState message="There are no failure records to display yet." />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-moss/15 bg-white shadow-panel">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-moss/10 text-sm">
                <thead className="bg-sand/55 text-left text-xs uppercase tracking-[0.15em] text-ink/70">
                  <tr>
                    <th className="px-4 py-3">Document ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Failure Reason</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-moss/10">
                  {failures.map((failure) => (
                    <tr key={failure.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-moss">
                        <Link href={`/documents/${failure.id}`} className="hover:text-ink">
                          {failure.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink">{failure.name || '—'}</td>
                      <td className="px-4 py-3 whitespace-pre-wrap text-ink/80">
                        {failure.failure_reason || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-ink/70"><DateAtom value={failure.created_at} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    )
  } catch {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Processing Failures"
          title="Inspect documents that did not complete processing."
          description="Failed documents are sorted by ingestion time. Failure reasons are derived from metadata when an error-like field is present."
        />
        <NoDataState message="No data is available right now. The database may be empty, unavailable, or still being initialized." />
      </div>
    )
  }
}
