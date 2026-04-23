'use client'

import { Menu } from 'lucide-react'

interface SidebarToggleProps {
  onClick: () => void
}

export default function SidebarToggle({ onClick }: SidebarToggleProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-sand p-2 text-ink hover:bg-sky"
      aria-label="Open navigation menu"
    >
      <Menu size={24} />
    </button>
  )
}
