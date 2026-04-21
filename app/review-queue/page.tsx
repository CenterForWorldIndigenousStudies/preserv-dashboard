import { Suspense, type ReactElement } from "react";
import { PageHeader } from "@organisms/PageHeader";
import { ReviewQueueTable } from "@organisms/ReviewQueueTable";
import { NoDataState } from "@organisms/NoDataState";
import { getReviewQueueDocuments } from "@lib/queries";

export const dynamic = "force-dynamic";

async function ReviewQueueContent() {
  const result = await getReviewQueueDocuments();

  if (result.total === 0) {
    return <NoDataState message="No documents are currently in the review queue." />;
  }
  return <ReviewQueueTable initialData={result} />;
}

export default function ReviewQueuePage(): ReactElement {
  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Review Queue"
        title="Documents needing human review."
        description="Documents with IN_PROGRESS or NEEDS_REVISION validation status, or flagged with needs_review or sensitive metadata."
      />

      <Suspense fallback={null}>
        <ReviewQueueContent />
      </Suspense>
    </div>
  );
}
