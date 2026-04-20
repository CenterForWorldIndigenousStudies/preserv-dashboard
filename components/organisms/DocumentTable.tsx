import type { ReactElement } from "react";
import Link from "next/link";

import { formatBytes, formatDateTime } from "@lib/format";
import type { Document } from "@lib/types";

interface DocumentTableProps {
  documents: Document[];
}

export function DocumentTable({ documents }: DocumentTableProps): ReactElement {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-moss/25 bg-white px-6 py-8 text-sm text-ink/65">
        No documents matched the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-moss/15 bg-white shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-moss/10 text-sm">
          <thead className="bg-sand/55 text-left text-xs uppercase tracking-[0.15em] text-ink/70">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss/10">
            {documents.map((document) => (
              <tr key={document.id} className="align-top">
                <td className="px-4 py-3 font-medium text-moss">
                  <Link href={`/documents/${document.id}`} className="hover:text-ink">
                    {document.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{document.name || "—"}</td>
                <td className="px-4 py-3 text-ink/70">{formatBytes(document.filesize)}</td>
                <td className="px-4 py-3 text-ink/70">{formatDateTime(document.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
