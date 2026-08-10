import Link from '@mui/material/Link'

import type { DisplayAndString } from 'types/shapes'

export function formatLinkableText(text: string): DisplayAndString {
  const trimmed = text.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      display: (
        <Link
          href={trimmed}
          target={'_blank'}
          rel={'noopener noreferrer'}
          underline={'hover'}
          sx={{ color: 'primary.main' }}
        >
          {trimmed}
        </Link>
      ),
      plainText: trimmed,
    }
  }
  return { display: trimmed, plainText: trimmed }
}
