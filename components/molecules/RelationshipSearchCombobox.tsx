'use client'

import { useState, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { SearchEntityBox } from '@molecules/SearchEntityBox'
import { useDocumentRelationshipSearch } from '@lib/hooks/useDocumentRelationshipSearch'
import type { DocumentRelationshipKind, RelationshipOption } from '@lib/queries/documentRelationshipQueries'

interface RelationshipSearchComboboxProps {
  kind: DocumentRelationshipKind
  open?: boolean
  disabled?: boolean
  excludedIds?: ReadonlySet<string>
  onSelect: (option: RelationshipOption) => void
}

export function RelationshipSearchCombobox({
  kind,
  open = true,
  disabled = false,
  excludedIds = new Set<string>(),
  onSelect,
}: RelationshipSearchComboboxProps): ReactElement {
  const [inputValue, setInputValue] = useState('')
  const { suggestions, isLoading, error } = useDocumentRelationshipSearch(kind, inputValue, open && !disabled)
  const label = kind === 'contributor' ? 'Add contributor' : 'Add publisher'
  const placeholder = kind === 'contributor' ? 'Search existing contributors' : 'Search existing publishers'

  return (
    <SearchEntityBox<RelationshipOption>
      inputValue={inputValue}
      options={suggestions}
      open={open}
      loading={isLoading}
      disabled={disabled}
      label={label}
      placeholder={placeholder}
      helperText={error ?? 'Choose an existing normalized record.'}
      onInputChange={setInputValue}
      onSelectOption={(option) => {
        if (excludedIds.has(option.id)) return
        onSelect(option)
        setInputValue('')
      }}
      getOptionLabel={(option) => option.name}
      getOptionKey={(option) => option.id}
      getOptionDisabled={(option) => excludedIds.has(option.id)}
      renderOption={(option) => (
        <Box component={'span'} sx={{ display: 'block', opacity: excludedIds.has(option.id) ? 0.5 : 1 }}>
          <Typography variant={'body2'} sx={{ color: 'text.primary', fontWeight: 500 }}>
            {option.name}
          </Typography>
          {option.notes ? (
            <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
              {option.notes}
            </Typography>
          ) : null}
        </Box>
      )}
    />
  )
}
