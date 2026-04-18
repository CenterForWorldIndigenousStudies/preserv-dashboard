import type { ReactElement } from "react";

import { FilterPill } from "@atoms/FilterPill";
import { DocumentTable } from "@organisms/DocumentTable";
import { NoDataState } from "@organisms/NoDataState";
import { PageHeader } from "@organisms/PageHeader";
import { Pagination } from "@molecules/Pagination";
import { StatCard } from "@molecules/StatCard";
import { getDocuments, getPageSize, getPipelineSummary } from "@lib/queries";

export const dynamic = "force-dynamic";

interface OverviewPageProps {
  searchParams?: Promise<{
    state?: string;
    page?: string;
  }>;
}

function buildOverviewHref(state?: string, page?: number): string {
  const params = new URLSearchParams();

  if (state) {
    params.set("state", state);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

export default async function OverviewPage({ searchParams }: OverviewPageProps): Promise<ReactElement> {
  const resolvedSearchParams = (await searchParams) ?? {};
  const state = resolvedSearchParams.state;
  const page = Number(resolvedSearchParams.page ?? "1");

  try {
    const [summary, documents] = await Promise.all([
      getPipelineSummary(),
      getDocuments({
        state,
        page,
      }),
    ]);

    const statCards = [
      { title: "Total", value: summary.total, href: "/" },
      { title: "Ingested", value: summary.by_state.ingested ?? 0, href: buildOverviewHref("ingested", 1) },
      { title: "Normalized", value: summary.by_state.normalized ?? 0, href: buildOverviewHref("normalized", 1) },
      { title: "Under Review", value: summary.by_state.under_review ?? 0, href: buildOverviewHref("under_review", 1) },
      { title: "Completed", value: summary.by_state.completed ?? 0, href: buildOverviewHref("completed", 1) },
      { title: "Failed", value: summary.by_state.failed ?? 0, href: "/failures" },
    ];

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Pipeline Overview"
          title="Track every document from ingest to completion."
          description="This MVP surfaces pipeline volume, review load, state-based document lists, and failures from the MySQL preservation database."
        />

        {summary.total === 0 && documents.total === 0 ? (
          <NoDataState message="The database is reachable, but there are no preservation records to display yet." />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {statCards.map((card) => (
                <StatCard key={card.title} title={card.title} value={card.value} href={card.href} />
              ))}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-moss/15 bg-white p-5 shadow-panel md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Document List</h2>
                  <p className="mt-1 text-sm text-ink/70">
                    {state ? `Filtered to ${state} documents.` : "Showing the latest documents across all states."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <FilterPill label="All" isActive={!state} href="/" />
                  {["ingested", "normalized", "under_review", "completed", "failed"].map((stateOption) => (
                    <FilterPill
                      key={stateOption}
                      label={stateOption}
                      isActive={state === stateOption}
                      href={buildOverviewHref(stateOption, 1)}
                    />
                  ))}
                </div>
              </div>

              <DocumentTable documents={documents.items} />

              <Pagination
                currentPage={Number.isNaN(page) || page < 1 ? 1 : page}
                totalItems={documents.total}
                pageSize={getPageSize()}
                buildHref={(nextPage: number) => buildOverviewHref(state, nextPage)}
              />
            </section>
          </>
        )}
      </div>
    );
  } catch {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Pipeline Overview"
          title="Track every document from ingest to completion."
          description="This MVP surfaces pipeline volume, review load, state-based document lists, and failures from the MySQL preservation database."
        />
        <NoDataState message="No data is available right now. The database may be empty, unavailable, or still being initialized." />
      </div>
    );
  }
}
