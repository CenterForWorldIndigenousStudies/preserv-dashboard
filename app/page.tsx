import { Suspense } from "react";
import { DocumentsTable } from "@organisms/DocumentsTable";
import { getAllDocuments } from "@lib/queries";

export const dynamic = "force-dynamic";

async function OverviewContent() {
  const initialData = await getAllDocuments({ page: 1, pageSize: 25 });
  return <DocumentsTable initialData={initialData} />;
}

export default function OverviewPage() {
  return (
    <div className="w-full">
      <Suspense fallback={null}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
