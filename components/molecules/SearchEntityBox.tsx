'use client'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ReactElement, ReactNode, SyntheticEvent } from 'react'

export interface SearchEntityBoxProps<TOption> {
  inputValue: string
  options: readonly TOption[]
  loading?: boolean
  disabled?: boolean
  error?: boolean
  required?: boolean
  label: string
  placeholder?: string
  helperText?: ReactNode
  open?: boolean
  openOnFocus?: boolean
  freeSolo?: boolean
  onInputChange: (value: string) => void
  onSelectOption?: (option: TOption) => void
  onSelectFreeText?: (value: string) => void
  getOptionLabel: (option: TOption) => string
  getOptionKey?: (option: TOption) => string
  renderOption?: (option: TOption) => ReactNode
  getOptionDisabled?: (option: TOption) => boolean
}

export function SearchEntityBox<TOption>({
  inputValue,
  options,
  loading = false,
  disabled = false,
  error = false,
  required = false,
  label,
  placeholder,
  helperText,
  open,
  openOnFocus = true,
  freeSolo = true,
  onInputChange,
  onSelectOption,
  onSelectFreeText,
  getOptionLabel,
  getOptionKey,
  renderOption,
  getOptionDisabled,
}: SearchEntityBoxProps<TOption>): ReactElement {
  function handleChange(_event: SyntheticEvent, selected: TOption | string | null): void {
    if (!selected) {
      return
    }

    if (typeof selected === 'string') {
      onSelectFreeText?.(selected)
      return
    }

    onSelectOption?.(selected)
  }

  return (
    <Autocomplete<TOption, false, false, boolean>
      fullWidth
      open={open}
      openOnFocus={openOnFocus}
      freeSolo={freeSolo}
      options={[...options]}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_event, nextValue) => onInputChange(nextValue)}
      onChange={handleChange}
      disabled={disabled}
      filterOptions={(availableOptions) => availableOptions}
      getOptionDisabled={getOptionDisabled}
      getOptionLabel={(option) => (typeof option === 'string' ? option : getOptionLabel(option))}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props
        const optionContent = renderOption?.(option) ?? (
          <Typography component={'span'} variant={'body2'}>
            {getOptionLabel(option)}
          </Typography>
        )

        return (
          <Box component={'li'} key={getOptionKey?.(option) ?? key} {...optionProps}>
            {optionContent}
          </Box>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          required={required}
        />
      )}
    />
  )
}
