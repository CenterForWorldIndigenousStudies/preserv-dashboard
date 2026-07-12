import type { ReactElement } from 'react'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import type { SxProps, Theme } from '@mui/material/styles'

interface DocumentTablePageSizeSelectProps {
  options: readonly number[]
  value: number
  onChange: (value: number) => void
  sx?: SxProps<Theme>
}

export function DocumentTablePageSizeSelect({
  options,
  value,
  onChange,
  sx,
}: DocumentTablePageSizeSelectProps): ReactElement {
  return (
    <Select<number>
      value={value}
      size="small"
      inputProps={{ 'aria-label': 'Rows per page' }}
      onChange={(event: SelectChangeEvent<number>) => onChange(Number(event.target.value))}
      sx={(theme: Theme) => ({
        minWidth: 120,
        borderRadius: 1,
        fontSize: '0.875rem',
        backgroundColor: theme.palette.background.paper,
        '& .MuiSelect-select': {
          px: 1.5,
          py: 0.75,
        },
        ...theme.unstable_sx(sx ?? {}),
      })}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option} rows
        </MenuItem>
      ))}
    </Select>
  )
}
