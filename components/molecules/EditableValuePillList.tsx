'use client'

import { useState, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

import { Button } from '@atoms/Button'
import { IconPlus } from '@atoms/icons/IconPlus'
import { ValuePillList } from '@molecules/ValuePillList'

interface EditableValuePillListProps {
  values: readonly string[]
  onChange: (values: string[]) => void
  emptyMessage?: string
}

export function EditableValuePillList({
  values,
  onChange,
  emptyMessage = 'No values available.',
}: EditableValuePillListProps): ReactElement {
  const [isAdding, setIsAdding] = useState(false)
  const [newValue, setNewValue] = useState('')

  function closeAddControl(): void {
    setIsAdding(false)
    setNewValue('')
  }

  function addValue(): void {
    const normalizedValue = newValue.trim()
    if (!normalizedValue || values.includes(normalizedValue)) return

    onChange([...values, normalizedValue])
    closeAddControl()
  }

  return (
    <Stack spacing={1.5}>
      <ValuePillList
        values={values}
        emptyMessage={emptyMessage}
        onRemove={(_, index) => onChange(values.filter((_, valueIndex) => valueIndex !== index))}
      />
      {isAdding ? (
        <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              autoFocus
              fullWidth
              size={'small'}
              label={'New value'}
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addValue()
                }
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button variant={'primary'} size={'sm'} aria-label={'Add'} onClick={addValue} disabled={!newValue.trim()}>
                {'Add'}
              </Button>
              <Button variant={'ghost'} size={'sm'} onClick={closeAddControl}>
                {'Cancel'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Button
          variant={'primary'}
          size={'sm'}
          aria-label={'Add value'}
          startIcon={<IconPlus size={16} />}
          onClick={() => setIsAdding(true)}
          sx={{ alignSelf: 'flex-start' }}
        >
          {'Add value'}
        </Button>
      )}
    </Stack>
  )
}
