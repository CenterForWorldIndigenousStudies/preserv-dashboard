import type { ReactElement } from "react";
import Link from "next/link";

import { AssignCollectionButton } from "@organisms/AssignCollectionButton";
import { NoDataState } from "@organisms/NoDataState";
import { PageHeader } from "@organisms/PageHeader";
import { formatBytes, formatDateTime, formatMetadataValue } from "@lib/format";
import { getDocumentDetail } from "@lib/queries";

export const dynamic = "force-dynamic";

interface DocumentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const documentFieldLabels: Array<{ key: string; label: string }> = [
  { key: "id", label: "Document ID" },
  { key: "filename", label: "Filename" },
  { key: "filesize", label: "File Size" },
  { key: "filetype", label: "File Type" },
  { key: "original_url", label: "Original URL" },
  { key: "created_at", label: "Created At" },
  { key: "updated_at", label: "Updated At" },
  { key: "file_folder_url", label: "File Folder URL" },
  { key: "original_parent_folder", label: "Original Parent Folder" },
  { key: "parent_id", label: "Parent ID" },
  { key: "duplicates", label: "Duplicates" },
  { key: "collection_tags", label: "Collection Tags" },
  { key: "state", label: "State" },
  { key: "ingested_at", label: "Ingested At" },
  { key: "is_primary", label: "Primary File" },
  { key: "drive_file_id", label: "Drive File ID" },
];

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps): Promise<ReactElement> {
  const { id } = await params;

  try {
    const detail = await getDocumentDetail(id);

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
      );
    }

    const { document, metadata, audits, reviews } = detail;

    const documentFieldValues = {
      ...document,
      filesize: formatBytes(document.filesize),
      created_at: formatDateTime(document.created_at),
      updated_at: formatDateTime(document.updated_at),
      ingested_at: formatDateTime(document.ingested_at),
      duplicates: document.duplicates.length > 0 ? document.duplicates.join(", ") : "—",
      collection_tags: document.collection_tags.length > 0 ? document.collection_tags.join(", ") : "—",
      is_primary: document.is_primary ? "Yes" : "No",
    } as Record<string, string>;

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Document Detail"
          title={document.filename || document.id}
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
                    {field.key === "original_url" && document.original_url ? (
                      <a href={document.original_url} className="text-moss underline" target="_blank" rel="noreferrer">
                        {document.original_url}
                      </a>
                    ) : field.key === "file_folder_url" && document.file_folder_url ? (
                      <a href={document.file_folder_url} className="text-moss underline" target="_blank" rel="noreferrer">
                        {document.file_folder_url}
                      </a>
                    ) : field.key === "collection_tags" ? (
                      <div className="flex flex-col gap-2">
                        <span>{documentFieldValues[field.key] || "—"}</span>
                        <AssignCollectionButton
                          documentId={document.id}
                          currentTags={document.collection_tags}
                        />
                      </div>
                    ) : (
                      documentFieldValues[field.key] || "—"
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
              <h2 className="text-xl font-semibold text-ink">Metadata</h2>
              {!metadata ? (
                <p className="mt-4 text-sm text-ink/65">No metadata record found.</p>
              ) : (
                <dl className="mt-6 space-y-3">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-sand/45 p-4">
                      <dt className="text-xs uppercase tracking-[0.15em] text-ink/60">{key}</dt>
                      <dd className="mt-2 text-sm text-ink">
                        <pre>{formatMetadataValue(value)}</pre>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
              <h2 className="text-xl font-semibold text-ink">Duplicates</h2>
              {document.duplicates.length === 0 ? (
                <p className="mt-4 text-sm text-ink/65">No duplicate links recorded.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {document.duplicates.map((duplicateId: string) => (
                    <li key={duplicateId}>
                      <Link href={`/documents/${duplicateId}`} className="text-sm text-moss underline">
                        {duplicateId}
                      </Link>
                    </li>
                  ))}
                </ul>
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
                  <div key={`${audit.document_id}-${audit.field_name}-${index}`} className="rounded-xl border border-moss/10 bg-sand/45 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{audit.field_name}</p>
                      <p className="text-xs uppercase tracking-[0.15em] text-ink/55">
                        {audit.source_name} • {formatDateTime(audit.changed_at)}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-ink/55">Before</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{audit.before_value || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-ink/55">After</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{audit.after_value || "—"}</p>
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
                      <span className="rounded-full bg-sky px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-ink">
                        {review.status}
                      </span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.15em] text-ink/55">
                      Winning Source: {review.winning_source || "—"} • {formatDateTime(review.created_at)}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-[0.15em] text-ink/55">Winning Value</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{review.winning_value || "—"}</p>
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
                                <p className="whitespace-pre-wrap">{conflictValue.value || "—"}</p>
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
    );
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
    );
  }
}
