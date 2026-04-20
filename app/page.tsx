import { DocumentsTable } from "@organisms/DocumentsTable";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return (
    <div className="w-full">
      <DocumentsTable />
    </div>
  );
}
