'use client'

import { useMemo, useState, type ReactElement, type SyntheticEvent } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useTagSearch, type TagSuggestion } from '@lib/hooks/useTagSearch'

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
}

function tagSearchFilterOptions(
  options: TagSearchOption[],
  { inputValue }: { inputValue: string },
): TagSearchOption[] {
  if (!inputValue.trim()) {
    return []
  }

  // The API already handles scoring and ranking, so we pass all results through.
  // We only filter here for the "Create new tag" option.
  return [...options]
}

export function TagSearchCombobox({
  open,
  value = '',
  onSelectExisting,
  onSelectCreate,
  disabled = false,
  label = 'Search tags',
  placeholder = 'Type to search or create a tag',
}: TagSearchComboboxProps): ReactElement {
  const [inputValue, setInputValue] = useState(value)
  const { suggestions, isLoading } = useTagSearch(inputValue, {
    enabled: open ?? true,
    limit: 7,
  })

  const options = useMemo(() => suggestions, [suggestions])

  async function handleChange(
    _event: SyntheticEvent,
    selected: TagSearchOption | string | null,
  ): Promise<void> {
    if (!selected) {
      return
    }

    if (typeof selected === 'string') {
      onSelectCreate(selected)
      return
    }

    if ('inputValue' in selected) {
      onSelectCreate(selected.inputValue)
      return
    }

    await onSelectExisting(selected)
    setInputValue('')
  }

  return (
    <Autocomplete<TagSearchOption, false, false, true>
      freeSolo
      openOnFocus
      options={options}
      loading={isLoading}
      inputValue={inputValue}
      onInputChange={(_event, nextValue) => setInputValue(nextValue)}
      onChange={(event, selected) => {
        void handleChange(event, selected)
      }}
      disabled={disabled}
      filterOptions={(availableOptions, params) => {
        const filtered = tagSearchFilterOptions(availableOptions, params)
        const normalizedInput = params.inputValue.trim()

        if (normalizedInput.length > 0) {
          filtered.push({
            id: '__create__',
            inputValue: normalizedInput,
            name: `Create new tag "${normalizedInput}"`,
            notes: null,
            score: -1,
          })
        }

        return filtered
      }}
      getOptionLabel={(option) => {
        if (typeof option === 'string') {
          return option
        }

        if ('inputValue' in option) {
          // Return the raw input value, not the display name
          return option.inputValue
        }

        return option.name
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props
        return (
          <li key={key} {...optionProps}>
            <div className="flex flex-col">
              <span className="font-medium text-ink">{option.name}</span>
              {option.notes ? <span className="text-sm text-ink/60">{option.notes}</span> : null}
            </div>
          </li>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText="Choose an existing tag or create a new one"
        />
      )}
    />
  )
}
