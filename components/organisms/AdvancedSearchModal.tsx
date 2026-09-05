'use client'

import { useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import { ACCESS_LEVEL_LABELS } from '@constants/accessLevels'
import { useBatchSearch } from '@lib/hooks/useBatchSearch'
import { useTagSearch, type TagSuggestion } from '@lib/hooks/useTagSearch'
import {
  DOCUMENT_TYPE_OPTIONS,
  type AccessLevelOption,
  type AdvancedSearchFilters,
  type FilterOptions,
  type StatusOption,
} from '@lib/search'
import { SearchEntityBox } from '@molecules/SearchEntityBox'
import type { BatchSearchSuggestion } from 'types/batches'

interface AdvancedSearchModalProps {
  filters: AdvancedSearchFilters
  filterOptions: FilterOptions
  onApply: (filters: AdvancedSearchFilters) => void
}

interface StatusFilterGroupProps {
  title: string
  options: StatusOption[]
  selected: StatusOption[]
  onToggle: (status: StatusOption) => void
}

interface StatusFilterGroupsProps {
  filterOptions: FilterOptions
  draftFilters: AdvancedSearchFilters
  onToggleDocumentStatus: (status: StatusOption) => void
  onToggleStatus: (field: 'lifecycleStatuses' | 'publicationStatuses', status: StatusOption) => void
}

function formatFilterLabel(value: string): string {
  return value
    .split('_')
    .map((part) => {
      const normalizedPart = part.toLowerCase()
      return normalizedPart.charAt(0).toUpperCase() + normalizedPart.slice(1)
    })
    .join(' ')
}

function renderTagOption(option: TagSuggestion): ReactNode {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Typography variant={'body2'} sx={{ color: 'text.primary', fontWeight: 500 }}>
        {option.name}
      </Typography>
      {option.notes ? (
        <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
          {option.notes}
        </Typography>
      ) : null}
    </Box>
  )
}

function renderBatchOption(option: BatchSearchSuggestion): ReactNode {
  return (
    <Typography variant={'body2'} sx={{ color: 'text.primary', fontWeight: 500 }}>
      {option.name}
    </Typography>
  )
}

function StatusFilterGroup({ title, options, selected, onToggle }: StatusFilterGroupProps): ReactElement {
  return (
    <Box>
      <Typography variant={'subtitle2'} sx={{ mb: 1.25 }}>
        {title}
      </Typography>
      <Stack direction={'row'} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {options.map((status) => {
          const isSelected = selected.includes(status)
          return (
            <Chip
              key={status}
              onClick={() => onToggle(status)}
              clickable
              label={formatFilterLabel(status)}
              sx={(theme: Theme) => ({
                borderRadius: '999px',
                border: `1px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.08)}`,
                backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.background.default,
                color: isSelected ? theme.palette.primary.contrastText : theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.action.hover,
                },
                '& .MuiChip-label': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
              })}
            />
          )
        })}
      </Stack>
    </Box>
  )
}

function StatusFilterGroups({
  filterOptions,
  draftFilters,
  onToggleDocumentStatus,
  onToggleStatus,
}: StatusFilterGroupsProps): ReactElement {
  return (
    <>
      <StatusFilterGroup
        title={'Document status'}
        options={filterOptions.statuses}
        selected={draftFilters.statuses ?? []}
        onToggle={onToggleDocumentStatus}
      />

      {filterOptions.lifecycleStatuses?.length ? (
        <StatusFilterGroup
          title={'Batch lifecycle status'}
          options={filterOptions.lifecycleStatuses}
          selected={draftFilters.lifecycleStatuses ?? []}
          onToggle={(status) => onToggleStatus('lifecycleStatuses', status)}
        />
      ) : null}

      {filterOptions.publicationStatuses?.length ? (
        <StatusFilterGroup
          title={'Publication status'}
          options={filterOptions.publicationStatuses}
          selected={draftFilters.publicationStatuses ?? []}
          onToggle={(status) => onToggleStatus('publicationStatuses', status)}
        />
      ) : null}
    </>
  )
}

export function AdvancedSearchModal({ filters, filterOptions, onApply }: AdvancedSearchModalProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<AdvancedSearchFilters>(filters)
  const tagSearch = useTagSearch(draftFilters.tag ?? '', { enabled: isOpen, limit: 7 })
  const batchSearch = useBatchSearch(draftFilters.batch ?? '', { enabled: isOpen, limit: 7 })

  useEffect(() => {
    if (!isOpen) {
      setDraftFilters(filters)
    }
  }, [filters, isOpen])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.author) count += 1
    if (filters.tag) count += 1
    if (filters.statuses?.length) count += 1
    if (filters.lifecycleStatuses?.length) count += 1
    if (filters.publicationStatuses?.length) count += 1
    if (filters.documentType && filters.documentType !== 'all') count += 1
    if (filters.batch) count += 1
    if (filters.createdFrom || filters.createdTo) count += 1
    if (filters.collection) count += 1
    if (filters.accessLevel) count += 1
    return count
  }, [filters])

  const openModal = useCallback(() => {
    setDraftFilters(filters)
    setIsOpen(true)
  }, [filters])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const applyFilters = useCallback(() => {
    onApply({
      author: draftFilters.author?.trim() || undefined,
      tag: draftFilters.tag?.trim() || undefined,
      statuses: draftFilters.statuses?.length ? draftFilters.statuses : undefined,
      lifecycleStatuses: draftFilters.lifecycleStatuses?.length ? draftFilters.lifecycleStatuses : undefined,
      publicationStatuses: draftFilters.publicationStatuses?.length ? draftFilters.publicationStatuses : undefined,
      documentType: draftFilters.documentType ?? 'all',
      batch: draftFilters.batch?.trim() || undefined,
      createdFrom: draftFilters.createdFrom || undefined,
      createdTo: draftFilters.createdTo || undefined,
      collection: draftFilters.collection || undefined,
      accessLevel: draftFilters.accessLevel || undefined,
    })
    closeModal()
  }, [closeModal, draftFilters, onApply])

  const resetFilters = useCallback(() => {
    const clearedFilters: AdvancedSearchFilters = {
      documentType: 'all',
    }
    setDraftFilters(clearedFilters)
    onApply(clearedFilters)
    closeModal()
  }, [closeModal, onApply])

  const toggleStatus = useCallback((status: StatusOption) => {
    setDraftFilters((previousFilters) => {
      const currentStatuses = previousFilters.statuses ?? []
      const nextStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((value) => value !== status)
        : [...currentStatuses, status]

      return {
        ...previousFilters,
        statuses: nextStatuses,
      }
    })
  }, [])

  const toggleStatusFilter = useCallback((field: 'lifecycleStatuses' | 'publicationStatuses', status: StatusOption) => {
    setDraftFilters((previousFilters) => {
      const currentStatuses = previousFilters[field] ?? []
      const nextStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((value) => value !== status)
        : [...currentStatuses, status]

      return {
        ...previousFilters,
        [field]: nextStatuses,
      }
    })
  }, [])

  return (
    <>
      <Stack
        direction={'row'}
        spacing={1.5}
        useFlexGap
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Button onClick={openModal} variant={'secondary'}>
          {'Advanced Search'}
        </Button>
        {activeFilterCount > 0 ? (
          <Typography
            variant={'overline'}
            sx={(theme) => ({
              color: alpha(theme.palette.text.primary, 0.72),
            })}
          >
            {`${activeFilterCount} active`}
          </Typography>
        ) : null}
      </Stack>

      <Dialog
        open={isOpen}
        onClose={closeModal}
        fullWidth
        maxWidth={'md'}
        sx={{
          '& .MuiBackdrop-root': {
            backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.3),
          },
          '& .MuiDialog-paper': {
            borderRadius: '1.5rem',
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
            boxShadow: '0 24px 80px rgba(35, 31, 32, 0.18)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Stack
            direction={'row'}
            spacing={2}
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant={'h6'} component={'h2'}>
                Advanced Search
              </Typography>
              <Typography
                variant={'body2'}
                sx={(theme) => ({
                  mt: 0.75,
                  color: alpha(theme.palette.text.primary, 0.72),
                })}
              >
                {'All filters are optional and combine with AND logic.'}
              </Typography>
            </Box>
            <IconButton
              onClick={closeModal}
              aria-label={'Close advanced search'}
              sx={(theme) => ({
                color: alpha(theme.palette.text.primary, 0.56),
                '&:hover': {
                  backgroundColor: theme.palette.background.default,
                  color: theme.palette.text.primary,
                },
              })}
            >
              <IconX size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ display: 'grid', gap: 3, pt: 1.5 }}>
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
            }}
          >
            <TextField
              label={'Author'}
              value={draftFilters.author ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, author: event.target.value }))
              }
              placeholder={'Partial author name'}
              fullWidth
              sx={{ mt: 0.5 }}
            />

            <SearchEntityBox<BatchSearchSuggestion>
              inputValue={draftFilters.batch ?? ''}
              options={batchSearch.suggestions}
              loading={batchSearch.isLoading}
              error={Boolean(batchSearch.error)}
              label={'Batch'}
              placeholder={'Partial batch name'}
              helperText={batchSearch.error ?? undefined}
              onInputChange={(value) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, batch: value }))
              }
              onSelectOption={(option) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, batch: option.name }))
              }
              getOptionLabel={(option) => option.name}
              getOptionKey={(option) => option.id}
              renderOption={renderBatchOption}
            />

            <SearchEntityBox<TagSuggestion>
              inputValue={draftFilters.tag ?? ''}
              options={tagSearch.suggestions}
              loading={tagSearch.isLoading}
              error={Boolean(tagSearch.error)}
              label={'Tag'}
              placeholder={'Tag name or close match'}
              helperText={tagSearch.error ?? undefined}
              onInputChange={(value) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, tag: value }))
              }
              onSelectOption={(option) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, tag: option.name }))
              }
              getOptionLabel={(option) => option.name}
              getOptionKey={(option) => option.id}
              renderOption={renderTagOption}
            />

            <TextField
              label={'Collection'}
              value={draftFilters.collection ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({
                  ...previousFilters,
                  collection: event.target.value || undefined,
                }))
              }
              select
              fullWidth
            >
              <MenuItem value={''}>{'All collections'}</MenuItem>
              {filterOptions.collections.map((collection) => (
                <MenuItem key={collection} value={collection}>
                  {collection}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={'Access Level'}
              value={draftFilters.accessLevel ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({
                  ...previousFilters,
                  accessLevel: event.target.value ? (event.target.value as AccessLevelOption) : undefined,
                }))
              }
              select
              fullWidth
            >
              <MenuItem value={''}>{'All access levels'}</MenuItem>
              {filterOptions.accessLevels.map((accessLevel) => (
                <MenuItem key={accessLevel} value={accessLevel}>
                  {ACCESS_LEVEL_LABELS[accessLevel]}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <StatusFilterGroups
            filterOptions={filterOptions}
            draftFilters={draftFilters}
            onToggleDocumentStatus={toggleStatus}
            onToggleStatus={toggleStatusFilter}
          />

          <FormControl>
            <FormLabel
              sx={(theme) => ({
                color: theme.palette.text.primary,
                fontSize: theme.typography.subtitle2.fontSize,
                fontWeight: theme.typography.fontWeightMedium,
                '&.Mui-focused': {
                  color: theme.palette.text.primary,
                },
              })}
            >
              {'Document Type'}
            </FormLabel>
            <RadioGroup
              row
              name={'document-type'}
              value={draftFilters.documentType ?? 'all'}
              onChange={(event) => {
                setDraftFilters((previousFilters) => ({
                  ...previousFilters,
                  documentType: event.target.value as AdvancedSearchFilters['documentType'],
                }))
              }}
              sx={{ mt: 1, gap: { xs: 0.5, sm: 2 } }}
            >
              {DOCUMENT_TYPE_OPTIONS.map((documentType) => (
                <FormControlLabel
                  key={documentType}
                  value={documentType}
                  control={<Radio />}
                  label={documentType === 'all' ? 'All' : `${formatFilterLabel(documentType)} only`}
                  sx={{
                    alignItems: 'center',
                    mr: 0,
                    '.MuiFormControlLabel-label': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
            }}
          >
            <TextField
              label={'Created from'}
              type={'date'}
              value={draftFilters.createdFrom ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({
                  ...previousFilters,
                  createdFrom: event.target.value || undefined,
                }))
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label={'Created to'}
              type={'date'}
              value={draftFilters.createdTo ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({
                  ...previousFilters,
                  createdTo: event.target.value || undefined,
                }))
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 0,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: { sm: 'flex-end' },
            gap: 1.5,
            '& > :not(style) ~ :not(style)': {
              ml: 0,
            },
          }}
        >
          <Button onClick={resetFilters} variant={'ghost'}>
            {'Reset'}
          </Button>
          <Button onClick={closeModal} variant={'secondary'}>
            {'Cancel'}
          </Button>
          <Button onClick={applyFilters} variant={'primary'}>
            {'Apply Filters'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
