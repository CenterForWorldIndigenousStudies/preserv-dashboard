'use client'

import type { ReactElement, ReactNode } from 'react'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import { EditableValuePillList } from '@molecules/EditableValuePillList'
import { useDocumentEditContext } from '@lib/hooks/useDocumentEditContext'
import { ACCESS_LEVEL_LABELS, ACCESS_LEVEL_OPTIONS } from '@constants/accessLevels'
import { DOCUMENT_ACCESS_LEVEL_FIELD } from '@constants/documentEditing'
import { normalizeAccessLevel } from '@lib/search'
import {
  formatDocumentDateInputValue,
  getDocumentMetadataValueType,
  normalizeDocumentEditValue,
  parseDocumentDateInputValue,
} from '@lib/documentEditing'
import { parseMetadataList, parseMetadataValue } from '@lib/metadata'
import type { DocumentEditValue } from 'types/documentEditing'
import type { MetadataField } from 'types/metadata'

interface EditableMetadataValueCellProps {
  field: MetadataField
  editable: boolean
  children: ReactNode
}

function parseEditableValue(field: MetadataField): DocumentEditValue {
  if (field.value_type?.toLowerCase() === 'json') {
    const values = parseMetadataList(field.value, field.value_type)
    return values.length > 0 ? values : null
  }

  if (field.value_type?.toLowerCase() === 'boolean') {
    return parseMetadataValue(field.value, field.value_type).plainText.toLowerCase() === 'true'
  }

  if (field.value_type?.toLowerCase() === 'unix_timestamp') {
    const timestamp = Number(parseMetadataValue(field.value, field.value_type).plainText)
    return Number.isFinite(timestamp) ? timestamp : null
  }

  return normalizeDocumentEditValue(parseMetadataValue(field.value, field.value_type).plainText)
}

export function EditableMetadataValueCell({ field, editable, children }: EditableMetadataValueCellProps): ReactElement {
  const editContext = useDocumentEditContext()

  if (!editable || !editContext?.isEditing) {
    return <>{children}</>
  }

  const context = editContext

  if (field.name === DOCUMENT_ACCESS_LEVEL_FIELD) {
    const value = context.draft.accessLevel ?? ''
    const label = 'Edit access level'
    return (
      <FormControl fullWidth size={'small'}>
        <InputLabel id={'document-access-level-label'}>{'Access Level'}</InputLabel>
        <Select
          labelId={'document-access-level-label'}
          value={value}
          label={'Access Level'}
          inputProps={{ 'aria-label': label }}
          onChange={(event) => context.updateAccessLevel(normalizeAccessLevel(event.target.value) ?? null)}
        >
          <MenuItem value={''}>{'No access level'}</MenuItem>
          {ACCESS_LEVEL_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {ACCESS_LEVEL_LABELS[option]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  const isCommentControl = field.name === 'comment_control' || field.name === 'comment'
  const isCommentAdditional = field.name === 'comment_additional'
  const value = isCommentControl
    ? context.draft.quality.comment
    : isCommentAdditional
      ? context.draft.quality.commentAdditional
      : (context.draft.metadata[field.name] ?? parseEditableValue(field))
  const type = getDocumentMetadataValueType(field.value_type)
  const label = `Edit ${field.name}`
  const isDate = type === 'date'
  const isLongText = type === 'string' && typeof value === 'string' && value.length > 70

  function updateValue(nextValue: DocumentEditValue): void {
    if (isCommentControl) {
      context.updateQuality('comment', typeof nextValue === 'string' ? nextValue : null)
      return
    }
    if (isCommentAdditional) {
      context.updateQuality('commentAdditional', typeof nextValue === 'string' ? nextValue : null)
      return
    }
    context.updateMetadata(field.name, nextValue)
  }

  if (type === 'boolean') {
    return (
      <Checkbox
        checked={value === true}
        onChange={(event) => updateValue(event.target.checked)}
        slotProps={{ input: { 'aria-label': label } }}
      />
    )
  }

  if (type === 'json') {
    return (
      <EditableValuePillList
        values={Array.isArray(value) ? value : []}
        onChange={(nextValues) => updateValue(nextValues)}
        emptyMessage={'No values available.'}
      />
    )
  }

  return (
    <TextField
      fullWidth
      multiline={isLongText}
      minRows={isLongText ? 3 : undefined}
      size={'small'}
      type={isDate ? 'date' : undefined}
      value={isDate ? formatDocumentDateInputValue(value) : typeof value === 'string' ? value : ''}
      onChange={(event) => updateValue(isDate ? parseDocumentDateInputValue(event.target.value) : event.target.value)}
      slotProps={{ htmlInput: { 'aria-label': label } }}
    />
  )
}
