import type { ReactElement } from "react";
import { PageHeader } from "@organisms/PageHeader";
import { ReviewQueueTable } from "@organisms/ReviewQueueTable";
import { NoDataState } from "@organisms/NoDataState";
import { getReviewQueueDocuments } from "@lib/queries";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage(): Promise<ReactElement> {
  try {
    const result = await getReviewQueueDocuments();

    return (
      <div className="w-full space-y-8">
        <PageHeader
          eyebrow="Review Queue"
          title="Documents needing human review."
          description="Documents with IN_PROGRESS or NEEDS_REVISION validation status, or flagged with needs_review or sensitive metadata."
        />

        {result.total === 0 ? (
          <NoDataState message="No documents are currently in the review queue." />
        ) : (
          <ReviewQueueTable initialData={result} />
        )}
      </div>
    );
  } catch {
    return (
      <div className="w-full space-y-8">
        <PageHeader
          eyebrow="Review Queue"
          title="Documents needing human review."
          description="Documents with IN_PROGRESS or NEEDS_REVISION validation status, or flagged with needs_review or sensitive metadata."
        />
        <NoDataState message="No data is available right now. The database may be unavailable or still initializing." />
      </div>
    );
  }
}
