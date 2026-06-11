import { Box, Typography } from '@mui/material'
import { KeyValueRow } from './KeyValueRow'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface NestedValueRendererProps {
  value: unknown
  level?: number
  /**
   * Max nesting depth. Render stops at the limit and renders the remaining
   * value as a JSON string. Defaults to 4.
   */
  maxDepth?: number
  /**
   * Typography variant for nested section headers (keys in object rows).
   */
  sectionVariant?: 'caption' | 'body2' | 'body1'
  /**
   * Label used when the value itself is rendered as a key (non-object root).
   */
  fallbackLabel?: string
}

// ---------------------------------------------------------------------------
// Utility functions (server-safe, no React hooks)
// ---------------------------------------------------------------------------

// Re-exported for use by KeyValueRow and external consumers

export function isPrimitiveValue(value: unknown): value is string | number | boolean | null | undefined {
  return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// ---------------------------------------------------------------------------
// NestedValueRenderer — Recursive renderer for nested unknown data
// ---------------------------------------------------------------------------

/**
 * Molecule: Recursively renders an unknown-shaped value as a collapsible
 * key-value tree.
 *
 * Handles:
 * - Primitive values (string, number, boolean, null) → rendered by KeyValueRow
 * - Arrays → enumerated items, recursed into
 * - Objects → key:value pairs, recursed into
 * - Mixed → primitives as leaf KeyValueRows, objects/arrays as recursive sections
 *
 * Use `level` to track nesting depth. Stops recursing at `maxDepth`.
 *
 * Works for batch metadata, document metadata, configuration blobs,
 * or any future nested data structure.
 *
 * @example
 * ```tsx
 * // Render a document metadata object
 * <NestedValueRenderer value={document.metadata} />
 *
 * // Render a deeply nested config with custom max depth
 * <NestedValueRenderer value={config} maxDepth={6} />
 * ```
 */
export function NestedValueRenderer({
  value,
  level = 1,
  maxDepth = 4,
  sectionVariant = 'caption',
  fallbackLabel = 'value',
}: NestedValueRendererProps): React.ReactElement | null {
  // Stop recursing at maxDepth — render as JSON string instead
  if (level > maxDepth) {
    let stringified = '[unstringable value]'
    try {
      stringified = JSON.stringify(value)
    } catch {
      // use default
    }
    return <KeyValueRow label={fallbackLabel} value={stringified} level={level - 1} />
  }

  if (Array.isArray(value)) {
    const items = value as unknown[]

    if (items.length === 0) {
      return <KeyValueRow label={`[${items.length}]`} value="(empty)" level={level} />
    }

    return (
      <>
        {items.map((item, index) => {
          if (isPrimitiveValue(item)) {
            return <KeyValueRow key={`${level}-${index}`} label={`[${index}]`} value={item} level={level} />
          }

          return (
            <Box key={`${level}-${index}`} sx={{ pl: level * 2, py: 0.5 }}>
              <Typography
                variant={sectionVariant}
                sx={{
                  fontWeight: 600,
                  color: '#355834',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                [{index}]
              </Typography>
              <NestedValueRenderer value={item} level={level + 1} maxDepth={maxDepth} />
            </Box>
          )
        })}
      </>
    )
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return <KeyValueRow label="{}" value="(empty object)" level={level} />
    }

    return (
      <>
        {entries.map(([nestedKey, nestedValue]) => {
          if (isPrimitiveValue(nestedValue)) {
            return <KeyValueRow key={`${level}-${nestedKey}`} label={nestedKey} value={nestedValue} level={level} />
          }

          return (
            <Box key={`${level}-${nestedKey}`} sx={{ pl: level * 2, py: 0.5 }}>
              <Typography
                variant={sectionVariant}
                sx={{
                  fontWeight: 600,
                  color: '#355834',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {nestedKey}
              </Typography>
              <NestedValueRenderer value={nestedValue} level={level + 1} maxDepth={maxDepth} />
            </Box>
          )
        })}
      </>
    )
  }

  // Non-object, non-array (e.g. a number or string at root level)
  return <KeyValueRow label={fallbackLabel} value={value} level={level} />
}
