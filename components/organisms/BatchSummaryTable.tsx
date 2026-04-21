"use client";

import { useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
} from "material-react-table";
import type { BatchSummary } from "@lib/types";

interface BatchSummaryTableProps {
  data: BatchSummary[];
}

export function BatchSummaryTable({ data }: BatchSummaryTableProps) {
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<MRT_ColumnDef<BatchSummary>[]>(() => [
    {
      accessorKey: "batch_name",
      header: "Batch Name",
      size: 280,
      Cell: ({ renderedCellValue }) => String(renderedCellValue as string | null ?? "—"),
    },
    {
      accessorKey: "validation_status",
      header: "Validation Status",
      size: 160,
      Cell: ({ renderedCellValue }) => String(renderedCellValue as string | null ?? "unknown"),
    },
    {
      accessorKey: "document_count",
      header: "Document Count",
      size: 140,
      Cell: ({ renderedCellValue }) => renderedCellValue as number,
    },
    {
      accessorKey: "batch_id",
      header: "Batch ID",
      size: 120,
      Cell: ({ renderedCellValue }) => {
        const val = String(renderedCellValue as string | null ?? "");
        return <span title={val}>{val.length > 8 ? `${val.slice(0, 8)}...` : val}</span>;
      },
    },
  ], []);

  const table = useMaterialReactTable({
    columns,
    data,
    manualFiltering: true,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: "#f4f1f0",
        color: "#231f20",
        fontWeight: 600,
        fontSize: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        borderBottom: "2px solid #355834",
      },
    },
    muiTableBodyCellProps: {
      sx: { color: "#231f20", fontSize: "0.875rem" },
    },
    muiTableBodyProps: {
      sx: {
        "& tr:nth-of-type(even)": { backgroundColor: "rgba(244,241,240,0.3)" },
        "& tr:hover": { backgroundColor: "rgba(53,88,52,0.06)" },
      },
    },
    muiTableContainerProps: {
      sx: { borderRadius: "0.75rem", border: "1px solid rgba(53,88,52,0.125)" },
    },
    muiSearchTextFieldProps: {
      placeholder: "Search batches...",
      sx: {
        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(53,88,52,0.25)" },
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#355834" },
      },
    },
    localization: {
      noRecordsToDisplay: "No batch data found.",
      search: "Search",
    },
    getRowId: (row) => row.batch_id,
  });

  return <MaterialReactTable table={table} />;
}
