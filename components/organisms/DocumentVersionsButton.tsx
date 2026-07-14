'use client'

import { useCallback, useMemo, useState, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
} from 'material-react-table'
import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import { getDocumentDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { DocumentNameBlock } from '@molecules/DocumentNameBlock'
import type { VersionFamily, VersionFamilyDocument } from 'types/documents'

interface DocumentVersionsButtonProps {
  versionFamily: VersionFamily
  returnHref?: string
  returnDocumentName?: string | null
}

function compareNullableStrings(a: string | null, b: string | null): number {
  return (a ?? '').localeCompare(b ?? '')
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  return (a ?? Number.NEGATIVE_INFINITY) - (b ?? Number.NEGATIVE_INFINITY)
}

function compareNullableDates(a: Date | string | null, b: Date | string | null): number {
  const left = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY
  const right = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY
  return left - right
}

function sortVersionDocuments(documents: VersionFamilyDocument[], sorting: MRT_SortingState): VersionFamilyDocument[] {
  if (!sorting.length) {
    return [...documents].sort((left, right) => Number(right.is_canonical) - Number(left.is_canonical))
  }

  const [{ id, desc }] = sorting
  const direction = desc ? -1 : 1

  return [...documents].sort((left, right) => {
    if (left.is_canonical !== right.is_canonical) {
      return left.is_canonical ? -1 : 1
    }

    const comparison = (() => {
      switch (id) {
        case 'id':
          return left.id.localeCompare(right.id)
        case 'name':
          return compareNullableStrings(left.name, right.name)
        case 'id_legacy':
          return compareNullableStrings(left.id_legacy, right.id_legacy)
        case 'filesize':
          return compareNullableNumbers(left.filesize, right.filesize)
        case 'hash_binary':
          return compareNullableStrings(left.hash_binary, right.hash_binary)
        case 'hash_content':
          return compareNullableStrings(left.hash_content, right.hash_content)
        case 'created_at':
          return compareNullableDates(left.created_at, right.created_at)
        case 'updated_at':
          return compareNullableDates(left.updated_at, right.updated_at)
        case 'is_duplicate':
          return Number(left.is_duplicate) - Number(right.is_duplicate)
        default:
          return 0
      }
    })()

    return comparison * direction
  })
}

function buildVersionDocumentHref(
  documentId: string,
  returnHref: string | undefined,
  returnDocumentName: string | null | undefined,
): string {
  const normalizedName = returnDocumentName?.trim()
  const returnLabel = normalizedName ? `${PAGE_LABELS.documentDetail}: ${normalizedName}` : PAGE_LABELS.documentDetail

  return getDocumentDetailPath(documentId, returnHref, returnLabel)
}

export function DocumentVersionsButton({
  versionFamily,
  returnHref,
  returnDocumentName,
}: DocumentVersionsButtonProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [sorting, setSorting] = useState<MRT_SortingState>([])

  const openModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const data = useMemo(() => sortVersionDocuments(versionFamily.documents, sorting), [sorting, versionFamily.documents])

  const columns = useMemo<MRT_ColumnDef<VersionFamilyDocument>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Document',
        size: 420,
        Cell: ({
          row: {
            original: { id, id_legacy, is_canonical, is_preservation_candidate, name, source_id },
          },
        }) => {
          // Get the source ID from the metadata if it exists, otherwise default to undefined to avoid displaying "null" in the UI
          return (
            <DocumentNameBlock
              name={name}
              id={id}
              isCandidate={is_preservation_candidate}
              isCanonical={is_canonical}
              legacyId={id_legacy}
              sourceId={source_id}
              href={buildVersionDocumentHref(id, returnHref, returnDocumentName)}
            />
          )
        },
      },
      {
        accessorKey: 'filesize',
        header: 'Size',
        size: 110,
        Cell: ({ row }) => <FileSize value={row.original.filesize} />,
      },
      {
        accessorKey: 'hash_binary',
        header: 'Binary Hash',
        size: 180,
        Cell: ({ row }) => {
          const value = row.original.hash_binary
          if (!value) return '—'
          return (
            <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }} title={value}>
              {value.length > 20 ? `${value.slice(0, 20)}...` : value}
            </Typography>
          )
        },
      },
      {
        accessorKey: 'hash_content',
        header: 'Content Hash',
        size: 180,
        Cell: ({ row }) => {
          const value = row.original.hash_content
          if (!value) return '—'
          return (
            <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }} title={value}>
              {value.length > 20 ? `${value.slice(0, 20)}...` : value}
            </Typography>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        size: 150,
        Cell: ({ row }) => <DateAtom value={row.original.created_at} />,
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        size: 150,
        Cell: ({ row }) => <DateAtom value={row.original.updated_at} />,
      },
      {
        accessorKey: 'is_duplicate',
        header: 'Is Duplicate',
        size: 120,
        Cell: ({ row }) => (row.original.is_duplicate ? 'True' : 'False'),
      },
    ],
    [returnDocumentName, returnHref],
  )

  const table = useMaterialReactTable({
    columns,
    data,
    manualSorting: true,
    enablePagination: false,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    onSortingChange: setSorting,
    state: { sorting },
    muiTableHeadCellProps: {
      sx: (theme: Theme) => ({
        backgroundColor: theme.palette.sand?.main ?? theme.palette.secondary.main,
        color: theme.palette.ink?.main ?? theme.palette.text.primary,
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: '2px solid',
        borderBottomColor: theme.palette.moss?.main ?? theme.palette.primary.main,
      }),
    },
    muiTableBodyCellProps: {
      sx: (theme: Theme) => ({
        color: theme.palette.ink?.main ?? theme.palette.text.primary,
        fontSize: '0.875rem',
      }),
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: (theme: Theme) => {
        const clayColor = theme.palette.clay?.main ?? theme.palette.error.main
        const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main
        const sandColor = theme.palette.sand?.main ?? theme.palette.secondary.main

        return row.original.is_canonical
          ? {
              backgroundColor: alpha(mossColor, 0.12),
              '& td': {
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: alpha(mossColor, 0.18),
              },
              '&:hover td': { backgroundColor: alpha(mossColor, 0.18) },
            }
          : row.original.is_duplicate
            ? {
                backgroundColor: alpha(clayColor, 0.12),
                '&:hover td': { backgroundColor: alpha(clayColor, 0.18) },
              }
            : {
                '&:nth-of-type(even) td': { backgroundColor: alpha(sandColor, 0.3) },
                '&:hover td': { backgroundColor: alpha(mossColor, 0.06) },
              }
      },
    }),
    muiTableContainerProps: {
      sx: (theme: Theme) => {
        const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main

        return {
          borderRadius: 1.5,
          border: 1,
          borderColor: alpha(mossColor, 0.125),
        }
      },
    },
    localization: {
      noRecordsToDisplay: 'No versions found.',
    },
    getRowId: (row) => row.id,
  })

  return (
    <>
      <Button onClick={openModal} variant="secondary">
        View Versions ({versionFamily.documents.length})
      </Button>

      <Dialog
        open={isOpen}
        onClose={closeModal}
        keepMounted
        fullWidth
        maxWidth="xl"
        aria-labelledby="document-versions-dialog-title"
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, maxHeight: '90vh' } }}
      >
        <DialogTitle
          id="document-versions-dialog-title"
          sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, pr: 1.5 }}
        >
          <Box>
            <Typography component="span" variant="h5" color="text.primary">
              Document Versions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              The canonical document is pinned to the top and highlighted separately from duplicate variants.
            </Typography>
          </Box>
          <IconButton onClick={closeModal} aria-label="Close">
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3, py: 2, minHeight: 0 }}>
          <MaterialReactTable table={table} />
        </DialogContent>
      </Dialog>
    </>
  )
}
