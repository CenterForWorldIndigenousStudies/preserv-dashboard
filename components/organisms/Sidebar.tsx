'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ClipboardList, Database, BookOpen, X } from 'lucide-react'
import AuthStatus from '@molecules/AuthStatus'

export type SidebarVariant = 'desktop' | 'mobile'

interface SidebarProps {
  variant: SidebarVariant
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/review-queue', label: 'Review Queue', icon: ClipboardList },
  { href: '/ready-for-library', label: 'Ready for Library', icon: BookOpen },
  { href: '/batch-summary', label: 'Batch Summary', icon: Database },
  { href: '/db', label: 'DB Schema', icon: Database },
  { href: '/component-library', label: 'Components', icon: BookOpen },
]

export default function Sidebar({ variant, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isMobile = variant === 'mobile'

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobile, isOpen, onClose])

  const sidebarContent = (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && (
        <div
          className={`fixed inset-0 z-40 bg-ink/50 ${isOpen ? 'block' : 'hidden'}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          flex h-full w-60 flex-col border-r border-moss/10 bg-sand
          ${
            isMobile
              ? `fixed left-0 top-0 z-50 transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
              : 'relative border-r'
          }
        `}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-moss/10 px-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink">Preservation Pipeline</p>
          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className={`rounded p-1 text-ink hover:bg-sky ${isMobile ? 'md:hidden' : 'hidden'}`}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={isMobile ? onClose : undefined}
                    className={`
                      flex items-center gap-3 rounded-full px-4 py-2 text-sm
                      ${isActive ? 'bg-clay text-white font-medium' : 'text-ink hover:bg-sky'}
                    `}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Auth status at bottom */}
        <div className="border-t border-moss/10 p-4">
          <AuthStatus />
        </div>
      </aside>
    </>
  )

  return sidebarContent
}
