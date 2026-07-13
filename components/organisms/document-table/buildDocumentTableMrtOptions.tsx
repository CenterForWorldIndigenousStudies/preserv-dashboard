import type { MRT_ColumnDef, MRT_RowData, MRT_TableOptions } from 'material-react-table'
import { alpha, type Theme } from '@mui/material/styles'

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
      sx: (theme: Theme) => ({
        backgroundColor: theme.palette.sand?.main ?? theme.palette.secondary.main,
        color: theme.palette.ink?.main ?? theme.palette.text.primary,
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        px: isReviewQueueDense ? 1.5 : undefined,
        py: isReviewQueueDense ? 1.25 : undefined,
      }),
    },
    muiTableBodyCellProps: {
      sx: (theme: Theme) => ({
        color: theme.palette.ink?.main ?? theme.palette.text.primary,
        fontSize: '0.875rem',
        px: isReviewQueueDense ? 1.5 : undefined,
        py: isReviewQueueDense ? 1.25 : undefined,
        verticalAlign: isReviewQueueDense ? 'top' : undefined,
      }),
    },
    muiTableBodyProps: {
      sx: (theme: Theme) => {
        const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main
        const sandColor = theme.palette.sand?.main ?? theme.palette.secondary.main

        return {
          '& tr:nth-of-type(even)': { backgroundColor: alpha(sandColor, 0.3) },
          '& tr:hover': { backgroundColor: alpha(mossColor, 0.06) },
        }
      },
    },
    muiTableContainerProps: {
      sx: (theme: Theme) => {
        const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main

        return {
          borderRadius: 1.5,
          border: 1,
          borderColor: alpha(mossColor, 0.125),
          maxHeight: isReviewQueueDense ? '70vh' : undefined,
        }
      },
    },
  }
}
