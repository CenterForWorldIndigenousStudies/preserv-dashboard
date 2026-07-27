'use client'

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ReactElement,
} from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { ExclusionReviewTree, type ExclusionReviewBranchState } from '@organisms/ExclusionReviewTree'
import { fetchWithTimeout } from '@lib/fetchWithTimeout'
import type {
  ExclusionReviewBranchPage,
  ExclusionReviewDecision,
  ExclusionReviewMutationResult,
  ExclusionReviewSearchResult,
  ExclusionReviewTreeNode,
  ExclusionReviewTreePayload,
} from 'types/exclusionReview'

const EXCLUSION_REVIEW_REQUEST_TIMEOUT_MS = 15_000

interface ExclusionReviewTreeResponse {
  isEditor: boolean
  tree: ExclusionReviewTreePayload
}

interface ExclusionReviewBranchResponse {
  page: ExclusionReviewBranchPage
}

interface ExclusionReviewSearchResponse {
  result: ExclusionReviewSearchResult
}

export interface ExclusionReviewWorkspaceProps {
  initialError?: string | null
  initialTree?: ExclusionReviewTreePayload | null
  isEditor?: boolean
}

export function SearchStatusAdornment({
  isSearching,
}: {
  isSearching: boolean
}): ReactElement | null {
  if (!isSearching) {
    return null
  }

  return (
    <InputAdornment position="end">
      <CircularProgress
        aria-label="Searching exclusion review"
        size={16}
        thickness={5}
      />
    </InputAdornment>
  )
}

function hydrateTree(tree: ExclusionReviewTreePayload): {
  branches: Record<string, ExclusionReviewBranchState>
  nodes: Record<string, ExclusionReviewTreeNode>
  rootId: string
} {
  const nodes: Record<string, ExclusionReviewTreeNode> = {
    [tree.root.driveId]: tree.root,
  }

  for (const item of tree.rootChildren.items) {
    nodes[item.driveId] = item
  }

  return {
    nodes,
    branches: {
      [tree.root.driveId]: {
        childIds: tree.rootChildren.items.map((item) => item.driveId),
        hasMore: tree.rootChildren.hasMore,
        loaded: true,
        loading: false,
        nextPageToken: tree.rootChildren.nextPageToken,
      },
    },
    rootId: tree.root.driveId,
  }
}

function mergeUniqueIds(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])]
}

function mergeBranchPage(
  previousNodes: Record<string, ExclusionReviewTreeNode>,
  previousBranches: Record<string, ExclusionReviewBranchState>,
  page: ExclusionReviewBranchPage,
): {
  branches: Record<string, ExclusionReviewBranchState>
  nodes: Record<string, ExclusionReviewTreeNode>
} {
  const nextNodes = { ...previousNodes }
  for (const item of page.items) {
    nextNodes[item.driveId] = item
  }

  const previousBranch = previousBranches[page.parentDriveId]
  return {
    nodes: nextNodes,
    branches: {
      ...previousBranches,
      [page.parentDriveId]: {
        childIds: previousBranch
          ? mergeUniqueIds(
              previousBranch.childIds,
              page.items.map((item) => item.driveId),
            )
          : page.items.map((item) => item.driveId),
        hasMore: page.hasMore,
        loaded: true,
        loading: false,
        nextPageToken: page.nextPageToken,
      },
    },
  }
}

function mergeUpdatedNodes(
  previousNodes: Record<string, ExclusionReviewTreeNode>,
  updatedNodes: ExclusionReviewTreeNode[],
): Record<string, ExclusionReviewTreeNode> {
  if (updatedNodes.length === 0) {
    return previousNodes
  }

  const nextNodes = { ...previousNodes }
  for (const item of updatedNodes) {
    nextNodes[item.driveId] = item
  }

  return nextNodes
}

export function mergeSearchPathNodes(
  previousNodes: Record<string, ExclusionReviewTreeNode>,
  previousBranches: Record<string, ExclusionReviewBranchState>,
  pathNodes: ExclusionReviewTreeNode[],
): {
  branches: Record<string, ExclusionReviewBranchState>
  nodes: Record<string, ExclusionReviewTreeNode>
} {
  if (pathNodes.length === 0) {
    return {
      nodes: previousNodes,
      branches: previousBranches,
    }
  }

  const nextNodes = { ...previousNodes }
  const nextBranches = { ...previousBranches }

  for (const item of pathNodes) {
    nextNodes[item.driveId] = item

    if (item.parentDriveId) {
      const previousBranch = nextBranches[item.parentDriveId]
      nextBranches[item.parentDriveId] = {
        childIds: previousBranch
          ? mergeUniqueIds(previousBranch.childIds, [item.driveId])
          : [item.driveId],
        hasMore: previousBranch?.hasMore ?? false,
        loaded: previousBranch?.loaded ?? false,
        loading: previousBranch?.loading ?? false,
        nextPageToken: previousBranch?.nextPageToken ?? null,
      }
    }

    if (item.itemType === 'folder' && !nextBranches[item.driveId]) {
      nextBranches[item.driveId] = {
        childIds: [],
        hasMore: false,
        loaded: false,
        loading: false,
        nextPageToken: null,
      }
    }
  }

  return {
    nodes: nextNodes,
    branches: nextBranches,
  }
}

export function ExclusionReviewWorkspace({
  initialError = null,
  initialTree = null,
  isEditor = false,
}: ExclusionReviewWorkspaceProps): ReactElement {
  const initialState = useMemo(
    () => (initialTree ? hydrateTree(initialTree) : null),
    [initialTree],
  )
  const [nodes, setNodes] = useState<Record<string, ExclusionReviewTreeNode>>(
    initialState?.nodes ?? {},
  )
  const [branches, setBranches] = useState<Record<string, ExclusionReviewBranchState>>(
    initialState?.branches ?? {},
  )
  const [rootId, setRootId] = useState<string | null>(initialState?.rootId ?? null)
  const [editorState, setEditorState] = useState(isEditor)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<string[]>(
    initialState?.rootId ? [initialState.rootId] : [],
  )
  const [loadingInitialTree, setLoadingInitialTree] = useState(!initialTree)
  const [searchValue, setSearchValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchVisibleIds, setSearchVisibleIds] = useState<Set<string> | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue)
  const nodesRef = useRef(nodes)
  const branchesRef = useRef(branches)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    branchesRef.current = branches
  }, [branches])

  useEffect(() => {
    if (initialTree) {
      return
    }

    let cancelled = false

    async function loadInitialTree(): Promise<void> {
      setLoadingInitialTree(true)

      try {
        const response = await fetchWithTimeout('/api/exclusion-review/tree', undefined, {
          timeoutMs: EXCLUSION_REVIEW_REQUEST_TIMEOUT_MS,
          timeoutMessage:
            'Loading exclusion review took too long. Please reload and try again.',
        })
        const payload = (await response.json()) as
          | ExclusionReviewTreeResponse
          | { error?: string }

        if (!response.ok) {
          throw new Error(
            'error' in payload && payload.error
              ? payload.error
              : 'Unable to load exclusion review.',
          )
        }

        if (cancelled || !('tree' in payload)) {
          return
        }

        const hydrated = hydrateTree(payload.tree)
        nodesRef.current = hydrated.nodes
        branchesRef.current = hydrated.branches
        startTransition(() => {
          setNodes(hydrated.nodes)
          setBranches(hydrated.branches)
          setRootId(hydrated.rootId)
          setExpandedIds([hydrated.rootId])
          setEditorState(payload.isEditor)
          setErrorMessage(null)
        })
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load exclusion review.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingInitialTree(false)
        }
      }
    }

    void loadInitialTree()

    return () => {
      cancelled = true
    }
  }, [initialTree])

  const loadChildren = async (
    driveId: string,
    nextPageToken: string | null = null,
  ): Promise<void> => {
    setBranches((current) => ({
      ...current,
      [driveId]: {
        childIds: current[driveId]?.childIds ?? [],
        hasMore: current[driveId]?.hasMore ?? false,
        loaded: current[driveId]?.loaded ?? false,
        loading: true,
        nextPageToken: current[driveId]?.nextPageToken ?? null,
      },
    }))

    try {
      const query = new URLSearchParams({ parentId: driveId })
      if (nextPageToken) {
        query.set('pageToken', nextPageToken)
      }

      const response = await fetchWithTimeout(
        `/api/exclusion-review/tree/children?${query.toString()}`,
        undefined,
        {
          timeoutMs: EXCLUSION_REVIEW_REQUEST_TIMEOUT_MS,
          timeoutMessage:
            'Loading this folder took too long. Please try expanding it again.',
        },
      )
      const payload = (await response.json()) as
        | ExclusionReviewBranchResponse
        | { error?: string }

      if (!response.ok) {
        throw new Error(
          'error' in payload && payload.error
            ? payload.error
            : 'Unable to load branch children.',
        )
      }

      if (!('page' in payload)) {
        return
      }

      const merged = mergeBranchPage(
        nodesRef.current,
        branchesRef.current,
        payload.page,
      )
      nodesRef.current = merged.nodes
      branchesRef.current = merged.branches
      startTransition(() => {
        setNodes(merged.nodes)
        setBranches(merged.branches)
        setErrorMessage(null)
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load branch children.',
      )
      setBranches((current) => {
        const nextBranches = {
          ...current,
          [driveId]: {
            childIds: current[driveId]?.childIds ?? [],
            hasMore: current[driveId]?.hasMore ?? false,
            loaded: current[driveId]?.loaded ?? false,
            loading: false,
            nextPageToken: current[driveId]?.nextPageToken ?? null,
          },
        }
        branchesRef.current = nextBranches
        return nextBranches
      })
    }
  }

  const ensurePathLoaded = async (path: string[]): Promise<void> => {
    /* eslint-disable no-await-in-loop */
    for (const ancestorDriveId of path) {
      const branch = branchesRef.current[ancestorDriveId]
      if (!branch?.loaded) {
        await loadChildren(ancestorDriveId)
      }
    }
    /* eslint-enable no-await-in-loop */
  }

  useEffect(() => {
    if (!deferredSearchValue.trim()) {
      setIsSearching(false)
      setSearchVisibleIds(null)
      return
    }

    let cancelled = false

    async function runSearch(): Promise<void> {
      setIsSearching(true)

      try {
        const response = await fetchWithTimeout(
          `/api/exclusion-review/search?q=${encodeURIComponent(
            deferredSearchValue.trim(),
          )}`,
          undefined,
          {
            timeoutMs: EXCLUSION_REVIEW_REQUEST_TIMEOUT_MS,
            timeoutMessage:
              'Searching exclusion review took too long. Please try again.',
          },
        )
        const payload = (await response.json()) as
          | ExclusionReviewSearchResponse
          | { error?: string }

        if (!response.ok) {
          throw new Error(
            'error' in payload && payload.error
              ? payload.error
              : 'Unable to search exclusion review.',
          )
        }

        if (!('result' in payload) || cancelled) {
          return
        }

        const nextVisibleIds = new Set<string>(payload.result.ancestorDriveIdsToExpand)
        for (const match of payload.result.matches) {
          nextVisibleIds.add(match.driveId)
          match.path.forEach((ancestorDriveId) => nextVisibleIds.add(ancestorDriveId))
        }

        const mergedPaths = mergeSearchPathNodes(
          nodesRef.current,
          branchesRef.current,
          payload.result.pathNodes,
        )
        const mergedNodes = mergeUpdatedNodes(
          mergedPaths.nodes,
          payload.result.matches,
        )
        nodesRef.current = mergedNodes
        branchesRef.current = mergedPaths.branches

        startTransition(() => {
          setNodes(mergedNodes)
          setBranches(mergedPaths.branches)
          setExpandedIds((current) =>
            mergeUniqueIds(
              current,
              payload.result.matches.flatMap((match) => match.path),
            ),
          )
          setSearchVisibleIds(nextVisibleIds)
          setErrorMessage(null)
        })

        /* eslint-disable no-await-in-loop */
        for (const match of payload.result.matches) {
          await ensurePathLoaded(match.path)
        }
        /* eslint-enable no-await-in-loop */
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to search exclusion review.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }

    void runSearch()

    return () => {
      cancelled = true
    }
  }, [deferredSearchValue])

  const handleToggle = async (driveId: string): Promise<void> => {
    const isExpanded = expandedIds.includes(driveId)
    if (isExpanded) {
      setExpandedIds((current) => current.filter((item) => item !== driveId))
      return
    }

    setExpandedIds((current) => mergeUniqueIds(current, [driveId]))
    if (!branches[driveId]?.loaded) {
      await loadChildren(driveId)
    }
  }

  const handleLoadMore = async (driveId: string): Promise<void> => {
    const nextPageToken = branches[driveId]?.nextPageToken ?? null
    if (!nextPageToken) {
      return
    }

    await loadChildren(driveId, nextPageToken)
  }

  const handleDecisionChange = async (
    driveId: string,
    decision: ExclusionReviewDecision,
  ): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        '/api/exclusion-review/decision',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ driveId, decision }),
        },
        {
          timeoutMs: EXCLUSION_REVIEW_REQUEST_TIMEOUT_MS,
          timeoutMessage:
            'Saving this review decision took too long. Please try again.',
        },
      )
      const payload = (await response.json()) as
        | ExclusionReviewMutationResult
        | { error?: string }

      if (!response.ok) {
        throw new Error(
          'error' in payload && payload.error
            ? payload.error
            : 'Unable to save review decision.',
        )
      }

      if (!('updatedNodes' in payload)) {
        return
      }

      startTransition(() => {
        setNodes((current) => mergeUpdatedNodes(current, payload.updatedNodes))
        setStatusMessage(
          decision === null
            ? 'Review cleared.'
            : `Marked ${decision}.`,
        )
        setErrorMessage(null)
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save review decision.',
      )
    }
  }

  const handleSyncBranch = async (driveId: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        '/api/exclusion-review/sync',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ driveId }),
        },
        {
          timeoutMs: EXCLUSION_REVIEW_REQUEST_TIMEOUT_MS,
          timeoutMessage: 'Syncing this branch took too long. Please try again.',
        },
      )
      const payload = (await response.json()) as
        | { result?: { updatedNodes?: ExclusionReviewTreeNode[]; syncedCount?: number } }
        | { error?: string }

      if (!response.ok) {
        throw new Error(
          'error' in payload && payload.error
            ? payload.error
            : 'Unable to sync branch.',
        )
      }

      startTransition(() => {
        if ('result' in payload && payload.result?.updatedNodes) {
          setNodes((current) =>
            mergeUpdatedNodes(current, payload.result?.updatedNodes ?? []),
          )
        }
        setStatusMessage('Branch sync requested.')
        setErrorMessage(null)
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sync branch.',
      )
    }
  }

  const rootNode = rootId ? nodes[rootId] : null

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Typography color="text.secondary" variant="body2">
        {rootNode
          ? `Configured root: ${rootNode.name}`
          : 'Loading configured root...'}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        {editorState
          ? 'You can include or exclude items in this workspace.'
          : 'Read-only view. Only allowlisted reviewers can edit.'}
      </Typography>
      <TextField
        label="Search this configured root"
        slotProps={{
          input: {
            endAdornment: <SearchStatusAdornment isSearching={isSearching} />,
          },
        }}
        onChange={(event) => setSearchValue(event.target.value)}
        type="search"
        value={searchValue}
      />
      {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
      {statusMessage ? <Alert severity="success">{statusMessage}</Alert> : null}
      <Box
        sx={{
          border: '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: 3,
          minHeight: 480,
          overflow: 'auto',
          p: 1.5,
          width: '100%',
        }}
      >
        {loadingInitialTree || !rootId ? (
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 360,
            }}
          >
            <CircularProgress size={28} />
            <Typography color="text.secondary">
              Loading exclusion review explorer...
            </Typography>
          </Stack>
        ) : (
          <ExclusionReviewTree
            branches={branches}
            expandedIds={expandedIds}
            isEditor={editorState}
            nodes={nodes}
            onDecisionChange={(driveId, decision) => {
              void handleDecisionChange(driveId, decision)
            }}
            onLoadMore={(driveId) => {
              void handleLoadMore(driveId)
            }}
            onSyncBranch={(driveId) => {
              void handleSyncBranch(driveId)
            }}
            onToggle={(driveId) => {
              void handleToggle(driveId)
            }}
            rootId={rootId}
            searchVisibleIds={searchVisibleIds}
          />
        )}
      </Box>
    </Stack>
  )
}
