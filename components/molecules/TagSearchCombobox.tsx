'use client'

import { useMemo, useState, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTagSearch, type TagSuggestion } from '@lib/hooks/useTagSearch'
import { SearchEntityBox } from '@molecules/SearchEntityBox'

interface CreateOption {
  id: '__create__'
  inputValue: string
  name: string
  notes: null
  score: number
}

type TagSearchOption = TagSuggestion | CreateOption

interface TagSearchComboboxProps {
  open?: boolean
  value?: string
  onSelectExisting: (tag: TagSuggestion) => Promise<void> | void
  onSelectCreate: (tagName: string) => void
  disabled?: boolean
  label?: string
  placeholder?: string
  getOptionDisabled?: (tag: TagSuggestion) => boolean
  getOptionHelperText?: (tag: TagSuggestion) => string | null
}

export function TagSearchCombobox({
  open,
  value = '',
  onSelectExisting,
  onSelectCreate,
  disabled = false,
  label = 'Search tags',
  placeholder = 'Type to search or create a tag',
  getOptionDisabled,
  getOptionHelperText,
}: TagSearchComboboxProps): ReactElement {
  const [inputValue, setInputValue] = useState(value)
  const { suggestions, isLoading } = useTagSearch(inputValue, {
    enabled: open ?? true,
    limit: 7,
  })

  async function handleSelectOption(selected: TagSearchOption): Promise<void> {
    if (!selected) {
      return
    }

    if ('inputValue' in selected) {
      onSelectCreate(selected.inputValue)
      return
    }

    if (getOptionDisabled?.(selected)) {
      return
    }

    await onSelectExisting(selected)
    setInputValue('')
  }

  const options = useMemo<TagSearchOption[]>(() => {
    const normalizedInput = inputValue.trim()
    if (!normalizedInput) {
      return []
    }

    return [
      ...suggestions,
      {
        id: '__create__',
        inputValue: normalizedInput,
        name: `Create new tag "${normalizedInput}"`,
        notes: null,
        score: -1,
      },
    ]
  }, [inputValue, suggestions])

  return (
    <SearchEntityBox<TagSearchOption>
      inputValue={inputValue}
      options={options}
      openOnFocus
      loading={isLoading}
      freeSolo
      onInputChange={setInputValue}
      onSelectOption={(selected) => {
        void handleSelectOption(selected)
      }}
      onSelectFreeText={onSelectCreate}
      disabled={disabled}
      label={label}
      placeholder={placeholder}
      getOptionLabel={(option) => {
        if ('inputValue' in option) {
          // Return the raw input value, not the display name
          return option.inputValue
        }

        return option.name
      }}
      getOptionDisabled={(option) => ('inputValue' in option ? false : (getOptionDisabled?.(option) ?? false))}
      renderOption={(option) => {
        const optionDisabled = 'inputValue' in option ? false : (getOptionDisabled?.(option) ?? false)
        const helperText = 'inputValue' in option ? null : (getOptionHelperText?.(option) ?? null)

        return (
          <Box component={'span'} sx={{ display: 'block', opacity: optionDisabled ? 0.5 : 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Typography variant={'body2'} sx={{ color: 'text.primary', fontWeight: 500 }}>
                {option.name}
              </Typography>
              {option.notes ? (
                <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
                  {option.notes}
                </Typography>
              ) : null}
              {helperText ? (
                <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
                  {helperText}
                </Typography>
              ) : null}
            </Box>
          </Box>
        )
      }}
      helperText={'Choose an existing tag or create a new one'}
    />
  )
}
