import type { ReactElement } from "react";
import { PageHeader } from "@organisms/PageHeader";
import { BatchSummaryTable } from "@organisms/BatchSummaryTable";
import { NoDataState } from "@organisms/NoDataState";
import { getBatchSummary } from "@lib/queries";

export const dynamic = "force-dynamic";

function SummaryCard({
  totalBatches,
  totalDocuments,
  byStatus,
}: {
  totalBatches: number;
  totalDocuments: number;
  byStatus: Record<string, number>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.15em] text-ink/60">Total Batches</p>
        <p className="mt-2 text-3xl font-semibold text-ink">{totalBatches}</p>
      </div>
      <div className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.15em] text-ink/60">Total Documents</p>
        <p className="mt-2 text-3xl font-semibold text-ink">{totalDocuments}</p>
      </div>
      {Object.entries(byStatus).map(([status, count]) => (
        <div key={status} className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
          <p className="text-xs uppercase tracking-[0.15em] text-ink/60">{status ?? "unknown"}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{count}</p>
        </div>
      ))}
    </div>
  );
}

export default async function BatchSummaryPage(): Promise<ReactElement> {
  try {
    const rows = await getBatchSummary();

    if (rows.length === 0) {
      return (
        <div className="w-full space-y-8">
          <PageHeader
            eyebrow="Batch Summary"
            title="Pipeline summary grouped by batch."
            description="Count of documents per validation status per batch, from the batches, document_to_batches, documents, and document_quality tables."
          />
          <NoDataState message="No batch data is available yet." />
        </div>
      );
    }

    // Aggregate for summary cards
    const batchIds = new Set(rows.map((r) => r.batch_id));
    const totalBatches = batchIds.size;
    const totalDocuments = rows.reduce((sum, r) => sum + r.document_count, 0);
    const byStatus: Record<string, number> = {};
    for (const row of rows) {
      const key = row.validation_status ?? "unknown";
      byStatus[key] = (byStatus[key] ?? 0) + row.document_count;
    }

    return (
      <div className="w-full space-y-8">
        <PageHeader
          eyebrow="Batch Summary"
          title="Pipeline summary grouped by batch."
          description="Count of documents per validation status per batch, from the batches, document_to_batches, documents, and document_quality tables."
        />

        <SummaryCard
          totalBatches={totalBatches}
          totalDocuments={totalDocuments}
          byStatus={byStatus}
        />

        <BatchSummaryTable data={rows} />
      </div>
    );
  } catch {
    return (
      <div className="w-full space-y-8">
        <PageHeader
          eyebrow="Batch Summary"
          title="Pipeline summary grouped by batch."
          description="Count of documents per validation status per batch, from the batches, document_to_batches, documents, and document_quality tables."
        />
        <NoDataState message="No data is available right now. The database may be unavailable or still initializing." />
      </div>
    );
  }
}
