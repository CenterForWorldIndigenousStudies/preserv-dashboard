import type { ReactElement } from 'react'

interface DocumentTablePageSizeSelectProps {
  options: readonly number[]
  value: number
  onChange: (value: number) => void
}

export function DocumentTablePageSizeSelect({
  options,
  value,
  onChange,
}: DocumentTablePageSizeSelectProps): ReactElement {
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="rounded-lg border border-[#355834]/20 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#355834]/30"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option} rows
        </option>
      ))}
    </select>
  )
}
