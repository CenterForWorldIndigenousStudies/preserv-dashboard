import type { DisplayAndString } from 'types/shapes'

/**
 * Format a pretty-printed JSON string for display.
 */
export function formatJsonDisplay(jsonString: string): DisplayAndString {
  return {
    display: (
      <pre
        style={{
          fontSize: '0.75rem',
          backgroundColor: '#f4f1f0',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}
      >
        {jsonString}
      </pre>
    ),
    plainText: jsonString,
  }
}
