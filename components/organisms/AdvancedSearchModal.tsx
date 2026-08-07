'use client'

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
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
import {
  DOCUMENT_TYPE_OPTIONS,
  type AccessLevelOption,
  type AdvancedSearchFilters,
  type FilterOptions,
  type StatusOption,
} from '@lib/search'

interface AdvancedSearchModalProps {
  filters: AdvancedSearchFilters
  filterOptions: FilterOptions
  onApply: (filters: AdvancedSearchFilters) => void
}

function formatFilterLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function AdvancedSearchModal({ filters, filterOptions, onApply }: AdvancedSearchModalProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<AdvancedSearchFilters>(filters)

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

  return (
    <>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Button onClick={openModal} variant="secondary">
          Advanced Search
        </Button>
        {activeFilterCount > 0 ? (
          <Typography
            variant="overline"
            sx={(theme) => ({
              color: alpha(theme.palette.text.primary, 0.72),
            })}
          >
            {activeFilterCount} active
          </Typography>
        ) : null}
      </Stack>

      <Dialog
        open={isOpen}
        onClose={closeModal}
        fullWidth
        maxWidth="md"
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
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" component="h2">
                Advanced Search
              </Typography>
              <Typography
                variant="body2"
                sx={(theme) => ({
                  mt: 0.75,
                  color: alpha(theme.palette.text.primary, 0.72),
                })}
              >
                All filters are optional and combine with AND logic.
              </Typography>
            </Box>
            <IconButton
              onClick={closeModal}
              aria-label="Close advanced search"
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
              label="Author"
              value={draftFilters.author ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, author: event.target.value }))
              }
              placeholder="Partial author name"
              fullWidth
              sx={{ mt: 0.5 }}
            />

            <TextField
              label="Batch"
              value={draftFilters.batch ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, batch: event.target.value }))
              }
              placeholder="Partial batch name"
              fullWidth
              sx={{ mt: 0.5 }}
            />

            <TextField
              label="Tag"
              value={draftFilters.tag ?? ''}
              onChange={(event) =>
                setDraftFilters((previousFilters) => ({ ...previousFilters, tag: event.target.value }))
              }
              placeholder="Tag name or close match"
              fullWidth
            />

            <TextField
              label="Collection"
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
              <MenuItem value="">All collections</MenuItem>
              {filterOptions.collections.map((collection) => (
                <MenuItem key={collection} value={collection}>
                  {collection}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Access Level"
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
              <MenuItem value="">All access levels</MenuItem>
              {filterOptions.accessLevels.map((accessLevel) => (
                <MenuItem key={accessLevel} value={accessLevel}>
                  {ACCESS_LEVEL_LABELS[accessLevel]}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.25 }}>
              Status
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: 'wrap',
              }}
            >
              {filterOptions.statuses.map((status) => {
                const isSelected = draftFilters.statuses?.includes(status) ?? false
                return (
                  <Chip
                    key={status}
                    onClick={() => {
                      toggleStatus(status)
                    }}
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
              Document Type
            </FormLabel>
            <RadioGroup
              row
              name="document-type"
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
              label="Created from"
              type="date"
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
              label="Created to"
              type="date"
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
          <Button onClick={resetFilters} variant="ghost">
            Reset
          </Button>
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={applyFilters} variant="primary">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
