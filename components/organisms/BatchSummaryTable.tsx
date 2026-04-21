"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import type { BatchSummary } from "@lib/types";

interface BatchSummaryTableProps {
  data: BatchSummary[];
}

export function BatchSummaryTable({ data }: BatchSummaryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "batch_name",
        header: "Batch Name",
        size: 280,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = (getValue() as string | null) ?? "—";
          return val;
        },
      },
      {
        accessorKey: "validation_status",
        header: "Validation Status",
        size: 160,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          return (getValue() as string | null) ?? "unknown";
        },
      },
      {
        accessorKey: "document_count",
        header: "Document Count",
        size: 140,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          return getValue() as number;
        },
      },
      {
        accessorKey: "batch_id",
        header: "Batch ID",
        size: 120,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = (getValue() as string | null) ?? "";
          const truncated = val.length > 8 ? `${val.slice(0, 8)}...` : val;
          return <span title={val}>{truncated}</span>;
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualFiltering: true,
    autoResetPageIndex: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search batches..."
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
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink/60">
                  No batch data found.
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
    </div>
  );
}
