'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ClipboardList, Database, BookOpen, FolderInput } from 'lucide-react'
import {
  BATCH_SUMMARY_PATH,
  COLLECTIONS_PATH,
  COMPONENT_LIBRARY_PATH,
  DB_SCHEMA_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
} from '@constants/paths'
import { AppVersion } from '@atoms/AppVersion'
import { SidebarHeader } from '@atoms/SidebarHeader'
import AuthStatus from '@molecules/AuthStatus'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

export type SidebarVariant = 'desktop' | 'mobile'

interface SidebarProps {
  variant: SidebarVariant
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/review-queue', label: 'Review Queue', icon: ClipboardList },
  { href: READY_FOR_LIBRARY_PATH, label: 'Ready for Library', icon: BookOpen },
  { href: BATCH_SUMMARY_PATH, label: 'Batch Summary', icon: Database },
  { href: PROCESS_DOCUMENTS_PATH, label: 'Process Documents', icon: FolderInput },
  { href: COLLECTIONS_PATH, label: 'Collections', icon: BookOpen },
  { href: DB_SCHEMA_PATH, label: 'DB Schema', icon: Database },
  { href: COMPONENT_LIBRARY_PATH, label: 'Components', icon: BookOpen },
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
        <SidebarHeader
          action={
            isMobile ? (
              <SidebarVisibilityControl
                intent="close"
                surface="sidebarHeader"
                onClick={onClose ?? (() => {})}
              />
            ) : undefined
          }
          className={`border-b border-moss/10 px-4 pb-3`}
          title={`Preservation Pipeline`}
        />

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
          <AppVersion />
        </div>
      </aside>
    </>
  )

  return sidebarContent
}
