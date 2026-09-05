'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { CheckboxProps } from '@mui/material/Checkbox'
import type { TableRowProps } from '@mui/material/TableRow'
import type { MRT_ColumnDef, MRT_RowSelectionState, MRT_Updater } from 'material-react-table'
import { useRouter } from 'next/navigation'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { Button } from '@atoms/Button'
import { DateAtom } from '@atoms/Date'
import { getDocumentDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import {
  buildDefaultReviewQueueChecklistState,
  type ReviewQueueChecklistItemKey,
  type ReviewQueueChecklistState,
} from '@constants/reviewQueueChecklist'
import { useOverviewTableState } from '@hooks/useOverviewTableState'
import { DEFAULT_REPROCESSING_START_STAGE } from '@lib/reprocessingDrafts'
import { type AdvancedSearchFilters, type FilterOptions, type StatusOption } from '@lib/search'
import type { DocumentsQueryParams } from '@lib/queries/queries'
import type { Document } from 'types/documents'
import type { DocumentsPageResult } from 'types/pagination'
import type { ReviewQueueDecision } from 'types/reviewQueue'
import type { ReprocessingDraftSummary } from 'types/reprocessingDrafts'
import type { CallbackStageKey } from 'types/pipelineContracts'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { NeedsReviewReasonsPopover } from '@molecules/NeedsReviewReasonsPopover'
import { ReviewQueueReprocessDialog } from '@organisms/ReviewQueueReprocessDialog'
import { ReviewQueueCommentsPopover } from '@molecules/ReviewQueueCommentsPopover'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import { ReviewQueueChecklistPanel } from '@organisms/ReviewQueueChecklistPanel'
import type { DocumentTableConfig } from '@organisms/DocumentTable/types'

const REVIEW_QUEUE_SELECTION_STORAGE_PREFIX = 'rq-row-selection'

interface ReviewQueueTableProps {
  initialData?: DocumentsPageResult
  initialQuery?: DocumentsQueryParams
  filterOptions: FilterOptions
  fixedStatuses?: StatusOption[]
  defaultStatuses?: StatusOption[]
  initialDrafts?: ReprocessingDraftSummary[]
}

interface ReviewQueueSelectionProps {
  enableRowSelection: boolean
  rowSelection?: MRT_RowSelectionState
  onRowSelectionChange?: (updater: MRT_Updater<MRT_RowSelectionState>) => void
  excludedRowIds?: readonly string[]
}

interface ReviewQueueActionButtonProps {
  batchActionPending: boolean
  selectedCount: number
  hasSelectedDraftDocuments: boolean
  onApprove: () => void
  onReject: () => void
  onReprocess: () => void
  onRemove: () => void
}

function getReviewQueueSelectionKey(queryKey: string): string {
  return `${REVIEW_QUEUE_SELECTION_STORAGE_PREFIX}:${queryKey}`
}

function saveReviewQueueSelection(queryKey: string, selection: MRT_RowSelectionState): void {
  try {
    sessionStorage.setItem(getReviewQueueSelectionKey(queryKey), JSON.stringify(selection))
  } catch {
    // Silent fail if storage is unavailable.
  }
}

function restoreReviewQueueSelection(queryKey: string): MRT_RowSelectionState {
  try {
    const stored = sessionStorage.getItem(getReviewQueueSelectionKey(queryKey))
    return stored ? (JSON.parse(stored) as MRT_RowSelectionState) : {}
  } catch {
    return {}
  }
}

function restoreScrollPosition(savedPosition: number): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedPosition, behavior: 'auto' })
    })
  })
}

function getValidationStatusBadgeVariant(status: string | null | undefined): BadgeVariant {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'VALIDATED':
      return 'success'
    case 'NEEDS_REVIEW':
    case 'FORMAT_ERRORS':
    case 'GENERAL_ERRORS':
    case 'METADATA_ISSUES':
    case 'REJECTED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function getReviewQueueDraftRowProps(document: Document): TableRowProps {
  if (!document.open_reprocessing_draft) return {}

  return {
    sx: (theme) => ({
      '& > td': { backgroundColor: alpha(theme.palette.warning.light, 0.2) },
      '&:hover > td': { backgroundColor: alpha(theme.palette.warning.light, 0.32) },
    }),
  }
}

function getReviewQueueDraftCheckboxProps(document: Document): CheckboxProps {
  if (!document.open_reprocessing_draft) return {}

  return {
    sx: (theme) => ({
      color: theme.palette.warning.main,
      '&.Mui-checked': { color: theme.palette.warning.dark },
    }),
  }
}

function normalizeReviewQueueComment(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : null
}

function buildReviewQueueColumns(params: {
  preservedOverviewHref: string
  getChecklistState: (document: Document) => ReviewQueueChecklistState
  onToggleChecklistItem: (
    documentId: string,
    itemKey: ReviewQueueChecklistItemKey,
    completed: boolean,
    previousState: ReviewQueueChecklistState,
  ) => void
}): MRT_ColumnDef<Document>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Document',
      size: 340,
      Cell: ({ row: { original } }) => (
        <EntityNameBlock
          name={original.name}
          id={original.id}
          legacyId={original.id_legacy}
          sourceId={original.source_id}
          href={getDocumentDetailPath(original.id, params.preservedOverviewHref, PAGE_LABELS.reviewQueue)}
        />
      ),
    },
    {
      accessorKey: 'validation_status',
      header: 'Validation Status',
      size: 180,
      enableSorting: false,
      Cell: ({ row: { original } }) => {
        const reviewReasons = original.needs_review_reasons ?? []
        const statusLabel = original.validation_status ?? (reviewReasons.length > 0 ? 'Review' : null)

        if (!statusLabel) {
          return (
            <Typography variant={'body2'} color={'text.secondary'}>
              {'-'}
            </Typography>
          )
        }

        const statusBadge = (
          <Badge variant={getValidationStatusBadgeVariant(original.validation_status)}>{statusLabel}</Badge>
        )

        if (reviewReasons.length === 0) {
          return statusBadge
        }

        return (
          <NeedsReviewReasonsPopover
            documentId={original.id}
            groups={reviewReasons}
            trigger={statusBadge}
            triggerLabel={`View review reasons for document ${original.id}`}
          />
        )
      },
    },
    {
      id: 'review_details',
      header: 'Review Details',
      size: 180,
      enableSorting: false,
      Cell: ({ row: { original } }) => {
        const validatorName = original.validator_name?.trim()
        const hasComments = Boolean(
          normalizeReviewQueueComment(original.validation_comment) ||
          normalizeReviewQueueComment(original.validation_comment_additional),
        )
        const reviewCommentsPill = hasComments ? <Badge variant={'neutral'}>{'Comments'}</Badge> : null
        const reviewContext = reviewCommentsPill ? (
          <ReviewQueueCommentsPopover
            documentId={original.id}
            comment={original.validation_comment}
            additionalComment={original.validation_comment_additional}
            trigger={reviewCommentsPill}
          />
        ) : null

        return (
          <Stack spacing={0.5}>
            {original.validation_timestamp ? (
              <DateAtom
                value={original.validation_timestamp}
                sx={{ color: 'text.secondary', fontSize: '0.75rem', alignSelf: 'flex-start' }}
              />
            ) : null}
            {validatorName ? <Typography variant={'body2'}>{validatorName}</Typography> : null}
            {reviewContext}
            {!original.validation_timestamp && !validatorName && !hasComments ? (
              <Typography variant={'body2'} color={'text.secondary'}>
                {'-'}
              </Typography>
            ) : null}
          </Stack>
        )
      },
    },
    {
      id: 'validation_checklist',
      header: 'Checklist',
      size: 140,
      enableSorting: false,
      Cell: ({ row: { original } }) => (
        <ReviewQueueChecklistPanel
          documentId={original.id}
          checklistState={params.getChecklistState(original)}
          onToggle={(itemKey) => {
            const checklistState = params.getChecklistState(original)
            params.onToggleChecklistItem(original.id, itemKey, !checklistState[itemKey], checklistState)
          }}
        />
      ),
    },
  ]
}

async function fetchReviewQueueTablePage(params: DocumentsQueryParams): Promise<DocumentsPageResult> {
  const { getNeedsReviewDocumentsAction } = await import('@actions/review-queue')
  return getNeedsReviewDocumentsAction(params)
}

async function updateReviewQueueChecklistForDocument(
  documentId: string,
  itemKey: ReviewQueueChecklistItemKey,
  completed: boolean,
): Promise<{ ok: true; checklist: ReviewQueueChecklistState } | { ok: false; error: string }> {
  const { updateReviewQueueChecklistAction } = await import('@actions/review-queue')
  return updateReviewQueueChecklistAction(documentId, itemKey, completed)
}

async function applyReviewQueueBatchDecisionForDocuments(documentIds: string[], decision: ReviewQueueDecision) {
  const { applyReviewQueueBatchDecisionAction } = await import('@actions/review-queue')
  return applyReviewQueueBatchDecisionAction(documentIds, decision)
}

function getReviewQueueSelectionProps(
  reviewQueueRowSelection: MRT_RowSelectionState,
  setReviewQueueRowSelection: (updater: MRT_Updater<MRT_RowSelectionState>) => void,
  optimisticallyHiddenDocumentIds: string[],
): ReviewQueueSelectionProps {
  return {
    enableRowSelection: true,
    rowSelection: reviewQueueRowSelection,
    onRowSelectionChange: setReviewQueueRowSelection,
    excludedRowIds: optimisticallyHiddenDocumentIds,
  }
}

export function ActionButton({
  batchActionPending,
  selectedCount,
  hasSelectedDraftDocuments,
  onApprove,
  onReject,
  onReprocess,
  onRemove,
}: ReviewQueueActionButtonProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)

  const closeMenu = (): void => {
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        variant={'secondary'}
        size={'sm'}
        disabled={batchActionPending || selectedCount === 0}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup={'menu'}
        aria-expanded={menuOpen ? 'true' : undefined}
      >
        {`Actions (${selectedCount})`}
      </Button>
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            closeMenu()
            onApprove()
          }}
        >
          {'Approve'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onReject()
          }}
        >
          {'Reject'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onReprocess()
          }}
        >
          {'Reprocess'}
        </MenuItem>
        {hasSelectedDraftDocuments ? (
          <MenuItem
            onClick={() => {
              closeMenu()
              onRemove()
            }}
          >
            {'Remove from draft'}
          </MenuItem>
        ) : null}
      </Menu>
    </>
  )
}

export function ReviewQueueTable({
  initialData,
  initialQuery,
  filterOptions,
  fixedStatuses,
  defaultStatuses,
  initialDrafts = [],
}: ReviewQueueTableProps): ReactElement {
  const router = useRouter()
  const resolveStatuses = (nextStatuses: StatusOption[] | undefined): StatusOption[] | undefined => {
    if (fixedStatuses?.length) {
      return fixedStatuses
    }

    if (nextStatuses?.length) {
      return nextStatuses
    }

    return defaultStatuses?.length ? defaultStatuses : undefined
  }
  const {
    accessLevel,
    batch,
    collection,
    createdFrom,
    createdTo,
    documentType,
    globalFilter,
    pathname,
    page,
    pageSize,
    queryParams,
    searchParams,
    statuses,
    tag,
    setGlobalFilter,
    setOverviewFilters,
    setPageSize,
    setSorting,
    sorting,
    goToNextPage,
    goToPreviousPage,
  } = useOverviewTableState(initialQuery)
  const effectiveStatuses = resolveStatuses(statuses)
  const effectiveQueryParams = useMemo<DocumentsQueryParams>(
    () => ({ ...queryParams, statuses: effectiveStatuses }),
    [effectiveStatuses, queryParams],
  )
  const [reviewQueueRowSelection, setReviewQueueRowSelection] = useState<MRT_RowSelectionState>({})
  const [batchActionPending, setBatchActionPending] = useState(false)
  const [selectedDraftDocumentIds, setSelectedDraftDocumentIds] = useState<string[]>([])
  const [reprocessDocumentIds, setReprocessDocumentIds] = useState<string[]>([])
  const [reprocessMode, setReprocessMode] = useState<'create' | 'existing'>('create')
  const [reprocessName, setReprocessName] = useState('')
  const [reprocessCollectionName, setReprocessCollectionName] = useState('')
  const [reprocessCollectionNotes, setReprocessCollectionNotes] = useState('')
  const [reprocessStage, setReprocessStage] = useState<CallbackStageKey>(DEFAULT_REPROCESSING_START_STAGE)
  const [reprocessReason, setReprocessReason] = useState('')
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [reprocessPending, setReprocessPending] = useState(false)
  const [optimisticallyHiddenDocumentIds, setOptimisticallyHiddenDocumentIds] = useState<string[]>([])
  const [reviewQueueChecklistByDocumentId, setReviewQueueChecklistByDocumentId] = useState<
    Record<string, ReviewQueueChecklistState>
  >({})
  const [toastState, setToastState] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  function openReprocessDialog(documentIds: string[]): void {
    setReprocessDocumentIds(documentIds)
    setReprocessMode('create')
    setReprocessName('')
    setReprocessCollectionName('')
    setReprocessCollectionNotes('')
    setReprocessStage(DEFAULT_REPROCESSING_START_STAGE)
    setReprocessReason('')
    setSelectedDraftId(null)
  }

  async function submitReprocessDraft(): Promise<void> {
    if (reprocessDocumentIds.length === 0 || reprocessPending) return
    setReprocessPending(true)
    try {
      const actions = await import('@actions/reprocessingDrafts')
      const result =
        reprocessMode === 'create'
          ? await actions.createReprocessingDraftForDocumentsAction({
              documentIds: reprocessDocumentIds,
              name: reprocessName,
              collectionName: reprocessCollectionName,
              collectionNotes: reprocessCollectionNotes,
              restartStage: reprocessStage,
              reason: reprocessReason,
            })
          : selectedDraftId
            ? await actions.addDocumentsToReprocessingDraftAction({
                batchId: selectedDraftId,
                documentIds: reprocessDocumentIds,
              })
            : { ok: false as const, error: 'Select an existing draft batch.' }
      if (!result.ok) {
        setToastState({ open: true, message: result.error, severity: 'error' })
        return
      }
      setToastState({
        open: true,
        message: `${reprocessDocumentIds.length === 1 ? 'Document' : 'Documents'} added to the reprocessing draft.`,
        severity: 'success',
      })
      setReprocessDocumentIds([])
      router.refresh()
    } catch (error: unknown) {
      setToastState({
        open: true,
        message: error instanceof Error ? error.message : 'The document could not be added.',
        severity: 'error',
      })
    } finally {
      setReprocessPending(false)
    }
  }
  const preservedOverviewHref = useMemo(() => {
    const currentSearch = searchParams.toString()
    return currentSearch ? `${pathname}?${currentSearch}` : pathname
  }, [pathname, searchParams])
  const currentFilters: AdvancedSearchFilters = useMemo(
    () => ({
      author: globalFilter || undefined,
      tag: tag || undefined,
      statuses: effectiveStatuses ?? [],
      documentType,
      batch: batch || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      collection: collection || undefined,
      accessLevel,
    }),
    [accessLevel, batch, collection, createdFrom, createdTo, documentType, effectiveStatuses, globalFilter, tag],
  )
  const reviewQueueQueryKey = useMemo(() => JSON.stringify(effectiveQueryParams), [effectiveQueryParams])
  const selectedReviewQueueDocumentIds = useMemo(
    () =>
      Object.entries(reviewQueueRowSelection)
        .filter(([, isSelected]) => isSelected)
        .map(([documentId]) => documentId),
    [reviewQueueRowSelection],
  )

  useEffect(() => {
    setSelectedDraftDocumentIds([])
    if (selectedReviewQueueDocumentIds.length === 0) return

    let cancelled = false
    void import('@actions/reprocessingDrafts')
      .then((actions) => actions.getOpenDraftDocumentIdsAction(selectedReviewQueueDocumentIds))
      .then((documentIds) => {
        if (!cancelled) setSelectedDraftDocumentIds(documentIds)
      })
      .catch(() => {
        if (!cancelled) setSelectedDraftDocumentIds([])
      })

    return () => {
      cancelled = true
    }
  }, [selectedReviewQueueDocumentIds])
  const reviewQueueSelectionProps = useMemo(
    () =>
      getReviewQueueSelectionProps(
        reviewQueueRowSelection,
        setReviewQueueRowSelection,
        optimisticallyHiddenDocumentIds,
      ),
    [optimisticallyHiddenDocumentIds, reviewQueueRowSelection],
  )

  useEffect(() => {
    const restored = restoreReviewQueueSelection(reviewQueueQueryKey)
    setReviewQueueRowSelection(restored)
  }, [reviewQueueQueryKey])

  useEffect(() => {
    saveReviewQueueSelection(reviewQueueQueryKey, reviewQueueRowSelection)
  }, [reviewQueueQueryKey, reviewQueueRowSelection])

  function getReviewQueueChecklistState(document: Document): ReviewQueueChecklistState {
    return (
      reviewQueueChecklistByDocumentId[document.id] ??
      document.review_checklist ??
      buildDefaultReviewQueueChecklistState()
    )
  }

  function toggleReviewQueueChecklistItem(
    documentId: string,
    itemKey: ReviewQueueChecklistItemKey,
    completed: boolean,
    previousState: ReviewQueueChecklistState,
  ): void {
    const nextState = { ...previousState, [itemKey]: completed }
    setReviewQueueChecklistByDocumentId((currentState) => ({
      ...currentState,
      [documentId]: nextState,
    }))

    void updateReviewQueueChecklistForDocument(documentId, itemKey, completed).then((result) => {
      if (result.ok) {
        setReviewQueueChecklistByDocumentId((currentState) => ({
          ...currentState,
          [documentId]: result.checklist,
        }))
        return
      }

      setReviewQueueChecklistByDocumentId((currentState) => ({
        ...currentState,
        [documentId]: previousState,
      }))
      setToastState({ open: true, message: result.error, severity: 'error' })
    })
  }

  async function handleBatchDecision(decision: ReviewQueueDecision): Promise<void> {
    if (selectedReviewQueueDocumentIds.length === 0) {
      return
    }

    setBatchActionPending(true)
    const scrollPos = window.scrollY

    try {
      const result = await applyReviewQueueBatchDecisionForDocuments(selectedReviewQueueDocumentIds, decision)

      if (result.processedIds.length > 0) {
        setOptimisticallyHiddenDocumentIds((currentIds) => [...new Set([...currentIds, ...result.processedIds])])
        setReviewQueueRowSelection({})
      }

      if (!result.ok) {
        setToastState({ open: true, message: result.error, severity: 'error' })
        return
      }

      setToastState({
        open: true,
        message:
          result.failed.length > 0
            ? `${result.message} Failed IDs: ${result.failed.map((failure) => failure.documentId).join(', ')}.`
            : result.message,
        severity: 'success',
      })
      router.refresh()
      restoreScrollPosition(scrollPos)
    } catch (error: unknown) {
      setToastState({
        open: true,
        message: error instanceof Error ? error.message : 'The selected documents could not be processed.',
        severity: 'error',
      })
    } finally {
      setBatchActionPending(false)
    }
  }

  async function handleRemoveSelectedDrafts(): Promise<void> {
    if (selectedReviewQueueDocumentIds.length === 0) return

    setBatchActionPending(true)
    try {
      const actions = await import('@actions/reprocessingDrafts')
      const result = await actions.removeDocumentsFromReprocessingDraftsAction(selectedReviewQueueDocumentIds)
      if (!result.ok) {
        setToastState({ open: true, message: result.error, severity: 'error' })
        return
      }

      setReviewQueueRowSelection({})
      setSelectedDraftDocumentIds([])
      setToastState({
        open: true,
        message:
          result.removedDocumentIds.length === 0
            ? 'No selected documents were in an open reprocessing draft.'
            : `${result.removedDocumentIds.length} document${result.removedDocumentIds.length === 1 ? '' : 's'} removed from reprocessing drafts.`,
        severity: 'success',
      })
      router.refresh()
    } catch (error: unknown) {
      setToastState({
        open: true,
        message: error instanceof Error ? error.message : 'The selected documents could not be removed from drafts.',
        severity: 'error',
      })
    } finally {
      setBatchActionPending(false)
    }
  }

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () =>
      buildReviewQueueColumns({
        preservedOverviewHref,
        getChecklistState: getReviewQueueChecklistState,
        onToggleChecklistItem: toggleReviewQueueChecklistItem,
      }),
    [preservedOverviewHref, reviewQueueChecklistByDocumentId],
  )
  const tableConfig: DocumentTableConfig<Document, AdvancedSearchFilters> = {
    definition: {
      tableId: 'review-queue-documents',
      columns,
      fetcher: async (query) =>
        fetchReviewQueueTablePage({
          page: query.page,
          pageSize: query.pageSize,
          orderBy: query.orderBy as DocumentsQueryParams['orderBy'],
          sortDirection: query.sortDirection,
          search: query.search,
          author: query.filters.author ?? query.search,
          tag: query.filters.tag,
          statuses: resolveStatuses(query.filters.statuses),
          documentType: query.filters.documentType,
          batch: query.filters.batch,
          createdFrom: query.filters.createdFrom,
          createdTo: query.filters.createdTo,
          collection: query.filters.collection,
          accessLevel: query.filters.accessLevel,
          cursorValue: query.cursorValue,
          cursorId: query.cursorId,
          cursorDirection: query.cursorDirection,
        }),
    },
    emptyMessage: 'No documents matched the current review queue filters.',
    searchPlaceholder: 'Search by name, legacy ID, batch...',
    styleVariant: 'reviewQueueDense',
    getRowProps: getReviewQueueDraftRowProps,
    getSelectCheckboxProps: getReviewQueueDraftCheckboxProps,
    ...reviewQueueSelectionProps,
    advancedSearch: {
      filters: currentFilters,
      filterOptions,
      onApply: (filters) => {
        setOverviewFilters({ ...filters, statuses: resolveStatuses(filters.statuses) })
      },
    },
    trailingToolbarSlot: (
      <ActionButton
        batchActionPending={batchActionPending}
        selectedCount={selectedReviewQueueDocumentIds.length}
        hasSelectedDraftDocuments={selectedDraftDocumentIds.length > 0}
        onApprove={() => {
          void handleBatchDecision('APPROVED')
        }}
        onReject={() => {
          void handleBatchDecision('REJECTED')
        }}
        onReprocess={() => {
          openReprocessDialog(selectedReviewQueueDocumentIds)
        }}
        onRemove={() => {
          void handleRemoveSelectedDrafts()
        }}
      />
    ),
  }

  return (
    <Box>
      <DocumentTable
        config={tableConfig}
        controller={{
          currentQueryKey: JSON.stringify(effectiveQueryParams),
          filters: currentFilters,
          page,
          pageSize,
          query: {
            page,
            pageSize,
            orderBy: effectiveQueryParams.orderBy,
            sortDirection: effectiveQueryParams.sortDirection,
            search: globalFilter || undefined,
            cursorValue: effectiveQueryParams.cursorValue,
            cursorId: effectiveQueryParams.cursorId,
            cursorDirection: effectiveQueryParams.cursorDirection,
            filters: currentFilters,
          },
          search: globalFilter,
          sorting,
          setFilters: (filters) => {
            setOverviewFilters({ ...filters, statuses: resolveStatuses(filters.statuses) })
          },
          setPageSize,
          setSearch: setGlobalFilter,
          setSorting,
          goToNextPage: (cursor) => {
            goToNextPage(cursor ?? null)
          },
          goToPreviousPage: (cursor) => {
            goToPreviousPage(cursor ?? null)
          },
        }}
        initialData={initialData}
        initialQuery={{
          page: effectiveQueryParams.page ?? 1,
          pageSize: effectiveQueryParams.pageSize ?? 25,
          orderBy: effectiveQueryParams.orderBy,
          sortDirection: effectiveQueryParams.sortDirection,
          search: effectiveQueryParams.search,
          cursorValue: effectiveQueryParams.cursorValue,
          cursorId: effectiveQueryParams.cursorId,
          cursorDirection: effectiveQueryParams.cursorDirection,
          filters: currentFilters,
        }}
      />
      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') {
            setToastState((current) => ({ ...current, open: false }))
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toastState.severity}
          variant={'filled'}
          onClose={() => {
            setToastState((current) => ({ ...current, open: false }))
          }}
        >
          {toastState.message}
        </Alert>
      </Snackbar>
      <ReviewQueueReprocessDialog
        open={reprocessDocumentIds.length > 0}
        documentName={`${reprocessDocumentIds.length} selected document${reprocessDocumentIds.length === 1 ? '' : 's'}`}
        mode={reprocessMode}
        name={reprocessName}
        collectionName={reprocessCollectionName}
        collectionNotes={reprocessCollectionNotes}
        restartStage={reprocessStage}
        reason={reprocessReason}
        drafts={initialDrafts}
        selectedDraftId={selectedDraftId}
        pending={reprocessPending}
        canCreate={Boolean(reprocessName.trim() && reprocessReason.trim())}
        onClose={() => setReprocessDocumentIds([])}
        onModeChange={setReprocessMode}
        onNameChange={setReprocessName}
        onCollectionNameChange={setReprocessCollectionName}
        onCollectionNotesChange={setReprocessCollectionNotes}
        onRestartStageChange={setReprocessStage}
        onReasonChange={setReprocessReason}
        onSelectedDraftChange={(draft) => setSelectedDraftId(draft?.id ?? null)}
        onSubmit={() => {
          void submitReprocessDraft()
        }}
      />
    </Box>
  )
}
