import { isValidElement, type ReactNode } from 'react'
import { Box, Typography, type TypographyProps } from '@mui/material'
import { isPrimitiveValue } from './NestedValueRenderer'

export { isPrimitiveValue }

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface KeyValueRowProps {
  label: string
  value: unknown
  level?: number
  /**
   * Grid template columns. Defaults to `'minmax(12rem, 16rem) 1fr'`.
   */
  columns?: string
  /**
   * Typography variant for the label. Defaults to 'body2' (0.875rem).
   */
  labelVariant?: 'caption' | 'body2' | 'body1'
  /**
   * Optional custom styles applied to the value Typography.
   */
  valueSx?: TypographyProps['sx']
}

// ---------------------------------------------------------------------------
// Utility functions (server-safe, no React hooks)
// ---------------------------------------------------------------------------

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    try {
      return JSON.stringify(value)
    } catch {
      return '[complex value]'
    }
  }
  return '-'
}

function renderDisplayValue(value: unknown): ReactNode {
  if (isValidElement(value)) {
    return value
  }
  return formatDisplayValue(value)
}

// ---------------------------------------------------------------------------
// KeyValueRow — Label + value pair for structured data display
// ---------------------------------------------------------------------------

/**
 * Molecule: A single label + value row for structured key-value data.
 *
 * Renders a two-column grid with a styled label and a value that handles
 * strings, numbers, booleans, null, and JSON-serializable objects.
 *
 * Use `level` to indent nested rows. Use `columns` to override the grid template
 * for custom layouts.
 *
 * @example
 * ```tsx
 * // Basic row
 * <KeyValueRow label="batch_id" value="abc123" />
 *
 * // Nested row with deeper indent
 * <KeyValueRow label="config" value={{ timeout: 30 }} level={2} />
 * ```
 */
export function KeyValueRow({
  label,
  value,
  level = 0,
  columns,
  labelVariant = 'body2',
  valueSx,
}: KeyValueRowProps): React.ReactElement {
  const displayValue = renderDisplayValue(value)
  const useMonospace = typeof value === 'string' && value.length > 32

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: columns ?? 'minmax(12rem, 16rem) 1fr',
        gap: 1.5,
        py: 1,
        pl: level * 2,
        borderLeft: level > 0 ? `2px solid ${theme.palette.divider}` : 'none',
      })}
    >
      <Typography variant={labelVariant} sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.875rem' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.875rem',
          color: 'text.primary',
          fontFamily: useMonospace ? 'monospace' : 'inherit',
          wordBreak: 'break-word',
          ...valueSx,
        }}
      >
        {displayValue}
      </Typography>
    </Box>
  )
}
