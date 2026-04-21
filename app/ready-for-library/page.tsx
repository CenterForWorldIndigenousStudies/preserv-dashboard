import type { ReactElement } from "react";
import { PageHeader } from "@organisms/PageHeader";
import { ReadyForLibraryTable } from "@organisms/ReadyForLibraryTable";
import { NoDataState } from "@organisms/NoDataState";
import { getReadyForLibraryDocuments } from "@lib/queries";

export const dynamic = "force-dynamic";

export default async function ReadyForLibraryPage(): Promise<ReactElement> {
  try {
    const result = await getReadyForLibraryDocuments();

    return (
      <div className="w-full space-y-8">
        <PageHeader
          eyebrow="Ready for Library"
          title="Approved documents ready for ingest."
          description="Documents with APPROVED validation status, a set access level, and all required Dublin Core metadata fields (dc_title, dc_type, dc_subject, dc_rights)."
        />

        {result.total === 0 ? (
          <NoDataState message="No documents are currently ready for library ingest." />
        ) : (
          <ReadyForLibraryTable initialData={result} />
        )}
      </div>
    );
  } catch {
    return (
      <div className="w-full space-y-8">
        <PageHeader
          eyebrow="Ready for Library"
          title="Approved documents ready for ingest."
          description="Documents with APPROVED validation status, a set access level, and all required Dublin Core metadata fields (dc_title, dc_type, dc_subject, dc_rights)."
        />
        <NoDataState message="No data is available right now. The database may be unavailable or still initializing." />
      </div>
    );
  }
}
