"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import Link from "next/link";
import { getReviewQueueAction } from "@actions/review-queue";
import type { ReviewQueueItem } from "@lib/types";


interface ReviewQueueTableProps {
  initialData?: { items: ReviewQueueItem[]; total: number };
}

export function ReviewQueueTable({ initialData }: ReviewQueueTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [tableData, setTableData] = useState<ReviewQueueItem[]>(initialData?.items ?? []);
  const [totalRowCount, setTotalRowCount] = useState<number>(initialData?.total ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
    [pagination.pageIndex, pagination.pageSize],
  );

  const shouldUseInitialData =
    initialData && pagination.pageIndex === 0 && !sorting.length && !globalFilter && !columnFilters.length;

  useEffect(() => {
    if (shouldUseInitialData) {
      setTableData(initialData.items);
      setTotalRowCount(initialData.total);
      return;
    }

    setIsLoading(true);
    startTransition(async () => {
      try {
        const result = await getReviewQueueAction();
        setTableData(result.items);
        setTotalRowCount(result.total);
      } catch {
        setTableData([]);
        setTotalRowCount(0);
      } finally {
        setIsLoading(false);
      }
    });
  }, [queryParams, shouldUseInitialData, initialData]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 120,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = (getValue() as string | null) ?? "";
          const truncated = val.length > 8 ? `${val.slice(0, 8)}...` : val;
          return <span title={val}>{truncated}</span>;
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        size: 280,
        cell: ({ row }: { row: { original: ReviewQueueItem } }) => {
          const val = row.original.name;
          if (!val) return "—";
          return (
            <Link href={`/documents/${row.original.id}`} className="text-moss hover:text-ink hover:underline">
              {val}
            </Link>
          );
        },
      },
      {
        accessorKey: "validation_status",
        header: "Validation Status",
        size: 160,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = (getValue() as string | null) ?? "—";
          return val;
        },
      },
      {
        accessorKey: "validation_type",
        header: "Validation Type",
        size: 140,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          return (getValue() as string | null) ?? "—";
        },
      },
      {
        accessorKey: "validator_name",
        header: "Validator Name",
        size: 160,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          return (getValue() as string | null) ?? "—";
        },
      },
      {
        accessorKey: "validator_email",
        header: "Validator Email",
        size: 180,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          return (getValue() as string | null) ?? "—";
        },
      },
      {
        accessorKey: "needs_review",
        header: "Needs Review",
        size: 120,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = getValue() as boolean;
          return val ? (
            <span className="rounded-full bg-clay px-3 py-1 text-xs font-medium text-white">Yes</span>
          ) : (
            <span className="text-ink/50">No</span>
          );
        },
      },
      {
        accessorKey: "sensitive",
        header: "Sensitive",
        size: 110,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = getValue() as boolean;
          return val ? (
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-sand">Yes</span>
          ) : (
            <span className="text-ink/50">No</span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: tableData,
    pageCount: Math.ceil(totalRowCount / pagination.pageSize),
    state: { pagination, sorting, globalFilter, columnFilters },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    autoResetPageIndex: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search review queue..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-64 px-3 py-2 border border-ink/20 rounded-lg text-sm placeholder:text-ink/40 focus:outline-none focus:border-moss"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink/10">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-ink/20">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-ink bg-paper"
                  >
                    <div
                      className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-1 text-ink/40">
                          {header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading || isPending ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink/60">
                  Loading...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink/60">
                  No documents in review queue.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-ink/10 ${idx % 2 === 0 ? "bg-paper" : "bg-paper/50"} hover:bg-moss/10 transition-colors`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-ink">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink/70">
          <span>Rows per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="border border-ink/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-moss"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="ml-4">
            {pagination.pageIndex * pagination.pageSize + 1}-
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRowCount)} of {totalRowCount}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border border-ink/20 rounded text-sm hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed">{"<<"}</button>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border border-ink/20 rounded text-sm hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed">{"<"}</button>
          <span className="px-3 py-1 text-sm">Page {pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 border border-ink/20 rounded text-sm hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed">{">"}</button>
          <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="px-3 py-1 border border-ink/20 rounded text-sm hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed">{">>"}</button>
        </div>
      </div>
    </div>
  );
}
