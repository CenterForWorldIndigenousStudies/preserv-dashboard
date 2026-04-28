'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
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
import type { VersionFamily, VersionFamilyDocument } from '@lib/types'

interface DocumentVersionsButtonProps {
  versionFamily: VersionFamily
}

function compareNullableStrings(a: string | null, b: string | null): number {
  return (a ?? '').localeCompare(b ?? '')
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  return (a ?? Number.NEGATIVE_INFINITY) - (b ?? Number.NEGATIVE_INFINITY)
}

function compareNullableDates(
  a: Date | string | null,
  b: Date | string | null,
): number {
  const left = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY
  const right = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY
  return left - right
}

function sortVersionDocuments(
  documents: VersionFamilyDocument[],
  sorting: MRT_SortingState,
): VersionFamilyDocument[] {
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

export function DocumentVersionsButton({ versionFamily }: DocumentVersionsButtonProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [sorting, setSorting] = useState<MRT_SortingState>([])
  const dialogRef = useRef<HTMLDialogElement>(null)

  const openModal = useCallback(() => {
    setIsOpen(true)
    requestAnimationFrame(() => dialogRef.current?.showModal())
  }, [])

  const closeModal = useCallback(() => {
    dialogRef.current?.close()
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeModal, isOpen])

  const data = useMemo(
    () => sortVersionDocuments(versionFamily.documents, sorting),
    [sorting, versionFamily.documents],
  )

  const columns = useMemo<MRT_ColumnDef<VersionFamilyDocument>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 120,
        Cell: ({ row }) => {
          const value = row.original.id
          return <span title={value}>{value.length > 8 ? `${value.slice(0, 8)}...` : value}</span>
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 260,
        Cell: ({ row }) => {
          const value = row.original.name
          if (!value) return '—'
          return (
            <Link href={`/documents/${row.original.id}`} style={{ color: '#355834' }}>
              {value}
            </Link>
          )
        },
      },
      {
        accessorKey: 'id_legacy',
        header: 'Legacy ID',
        size: 180,
        Cell: ({ row }) => {
          const value = row.original.id_legacy
          if (!value) return '—'
          return <span title={value}>{value.length > 30 ? `${value.slice(0, 30)}...` : value}</span>
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
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={value}>
              {value.length > 20 ? `${value.slice(0, 20)}...` : value}
            </span>
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
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={value}>
              {value.length > 20 ? `${value.slice(0, 20)}...` : value}
            </span>
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
    [],
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
      sx: {
        backgroundColor: '#f4f1f0',
        color: '#231f20',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: '2px solid #355834',
      },
    },
    muiTableBodyCellProps: {
      sx: { color: '#231f20', fontSize: '0.875rem' },
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: row.original.is_duplicate
        ? {
            backgroundColor: 'rgba(184, 96, 80, 0.12)',
            '&:hover td': { backgroundColor: 'rgba(184, 96, 80, 0.18)' },
          }
        : {
            '&:nth-of-type(even) td': { backgroundColor: 'rgba(244,241,240,0.3)' },
            '&:hover td': { backgroundColor: 'rgba(53,88,52,0.06)' },
          },
    }),
    muiTableContainerProps: {
      sx: { borderRadius: '0.75rem', border: '1px solid rgba(53,88,52,0.125)' },
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

      <dialog
        ref={dialogRef}
        onClose={closeModal}
        className="rounded-2xl border border-moss/15 bg-white p-0 shadow-panel backdrop:bg-ink/30"
        style={{ padding: 0, minWidth: 'min(1200px, 94vw)' }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink">Document Versions</h3>
              <p className="mt-2 text-sm text-ink/70">
                The canonical document is always pinned to the top. Duplicate variants are highlighted.
              </p>
            </div>
            <button
              onClick={closeModal}
              className="rounded-full p-1 text-ink/50 hover:bg-sand hover:text-ink"
              aria-label="Close"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="mt-6">
            <MaterialReactTable table={table} />
          </div>
        </div>
      </dialog>
    </>
  )
}
