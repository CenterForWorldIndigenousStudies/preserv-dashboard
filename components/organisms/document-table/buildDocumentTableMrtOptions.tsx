import type { MRT_ColumnDef, MRT_RowData, MRT_TableOptions } from 'material-react-table'

interface BuildDocumentTableMrtOptionsInput<TData extends MRT_RowData> {
  columns: MRT_ColumnDef<TData>[]
  data: TData[]
  emptyMessage: string
  styleVariant?: 'default' | 'reviewQueueDense'
}

export function buildDocumentTableMrtOptions<TData extends MRT_RowData>({
  columns,
  data,
  emptyMessage,
  styleVariant = 'default',
}: BuildDocumentTableMrtOptionsInput<TData>): Partial<MRT_TableOptions<TData>> {
  const isReviewQueueDense = styleVariant === 'reviewQueueDense'

  return {
    columns,
    data,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableGlobalFilter: false,
    enableHiding: false,
    enableMultiSort: false,
    enableStickyHeader: true,
    localization: {
      noRecordsToDisplay: emptyMessage,
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: '#f4f1f0',
        color: '#231f20',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        px: isReviewQueueDense ? 1.5 : undefined,
        py: isReviewQueueDense ? 1.25 : undefined,
      },
    },
    muiTableBodyCellProps: {
      sx: {
        color: '#231f20',
        fontSize: '0.875rem',
        px: isReviewQueueDense ? 1.5 : undefined,
        py: isReviewQueueDense ? 1.25 : undefined,
        verticalAlign: isReviewQueueDense ? 'top' : undefined,
      },
    },
    muiTableBodyProps: {
      sx: {
        '& tr:nth-of-type(even)': { backgroundColor: 'rgba(244,241,240,0.3)' },
        '& tr:hover': { backgroundColor: 'rgba(53,88,52,0.06)' },
      },
    },
    muiTableContainerProps: {
      sx: {
        borderRadius: '0.75rem',
        border: '1px solid rgba(53,88,52,0.125)',
        maxHeight: isReviewQueueDense ? '70vh' : undefined,
      },
    },
  }
}
