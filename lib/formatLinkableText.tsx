import type { DisplayAndString } from 'types/shapes'

export function formatLinkableText(text: string): DisplayAndString {
  const trimmed = text.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      display: (
        <a href={trimmed} target="_blank" rel="noopener noreferrer" className="text-[#355834] hover:underline">
          {trimmed}
        </a>
      ),
      plainText: trimmed,
    }
  }
  return { display: trimmed, plainText: trimmed }
}
