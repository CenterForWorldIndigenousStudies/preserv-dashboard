import type { ReactElement } from "react";
import Link from "next/link";

import { FilterPill } from "@atoms/FilterPill";
import { NoDataState } from "@organisms/NoDataState";
import { PageHeader } from "@organisms/PageHeader";
import { Pagination } from "@molecules/Pagination";
import { formatDateTime } from "@lib/format";
import { getDistinctReviewFields, getPageSize, getReviewQueue } from "@lib/queries";

export const dynamic = "force-dynamic";

interface ReviewsPageProps {
  searchParams?: Promise<{
    status?: string;
    field?: string;
    page?: string;
  }>;
}

function buildReviewsHref(status?: string, field?: string, page?: number): string {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  if (field) {
    params.set("field", field);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/reviews?${queryString}` : "/reviews";
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps): Promise<ReactElement> {
  const resolvedSearchParams = (await searchParams) ?? {};
  const status = resolvedSearchParams.status;
  const field = resolvedSearchParams.field;
  const page = Number(resolvedSearchParams.page ?? "1");

  try {
    const [reviewResult, fieldOptions] = await Promise.all([
      getReviewQueue({
        status,
        field,
        page,
      }),
      getDistinctReviewFields(),
    ]);

    const statuses = ["pending", "in_progress", "resolved"];

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Human Review Queue"
          title="Resolve metadata conflicts before final completion."
          description="Review items are sorted by newest first and can be filtered by status or field name. Each row links back to the document detail page."
        />

        {reviewResult.total === 0 && fieldOptions.length === 0 && !status && !field ? (
          <NoDataState message="The database is reachable, but there are no review records to display yet." />
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <FilterPill label="All" isActive={!status} href={buildReviewsHref(undefined, field, 1)} />
                    {statuses.map((statusOption) => (
                      <FilterPill
                        key={statusOption}
                        label={statusOption}
                        isActive={status === statusOption}
                        href={buildReviewsHref(statusOption, field, 1)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-ink">Field Name</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <FilterPill label="All Fields" isActive={!field} href={buildReviewsHref(status, undefined, 1)} />
                    {fieldOptions.map((fieldOption) => (
                      <FilterPill
                        key={fieldOption}
                        label={fieldOption}
                        isActive={field === fieldOption}
                        href={buildReviewsHref(status, fieldOption, 1)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-moss/15 bg-white shadow-panel">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-moss/10 text-sm">
                  <thead className="bg-sand/55 text-left text-xs uppercase tracking-[0.15em] text-ink/70">
                    <tr>
                      <th className="px-4 py-3">Document ID</th>
                      <th className="px-4 py-3">Filename</th>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Conflicting Values</th>
                      <th className="px-4 py-3">Winning Source</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-moss/10">
                    {reviewResult.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-ink/60">
                          No review items matched the current filters.
                        </td>
                      </tr>
                    ) : (
                      reviewResult.items.map((reviewItem) => (
                        <tr key={reviewItem.id} className="align-top">
                          <td className="px-4 py-3 font-medium text-moss">
                            <Link href={`/documents/${reviewItem.document_id}`} className="hover:text-ink">
                              {reviewItem.document_id}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-ink">{reviewItem.filename || "—"}</td>
                          <td className="px-4 py-3 text-ink">{reviewItem.field_name}</td>
                          <td className="px-4 py-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              {reviewItem.conflicting_values.length === 0 ? (
                                <p className="text-ink/55">No conflict payload</p>
                              ) : (
                                reviewItem.conflicting_values.map((conflictValue, index) => (
                                  <div key={`${reviewItem.id}-${index}`} className="rounded-xl bg-sand/60 p-3">
                                    <p className="text-xs uppercase tracking-[0.15em] text-ink/60">{conflictValue.source}</p>
                                    <p className="mt-2 whitespace-pre-wrap text-ink">{conflictValue.value || "—"}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-ink">{reviewItem.winning_source || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-sky px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-ink">
                              {reviewItem.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink/70">{formatDateTime(reviewItem.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              currentPage={Number.isNaN(page) || page < 1 ? 1 : page}
              totalItems={reviewResult.total}
              pageSize={getPageSize()}
              buildHref={(nextPage: number) => buildReviewsHref(status, field, nextPage)}
            />
          </section>
        )}
      </div>
    );
  } catch {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Human Review Queue"
          title="Resolve metadata conflicts before final completion."
          description="Review items are sorted by newest first and can be filtered by status or field name. Each row links back to the document detail page."
        />
        <NoDataState message="No data is available right now. The database may be empty, unavailable, or still being initialized." />
      </div>
    );
  }
}
