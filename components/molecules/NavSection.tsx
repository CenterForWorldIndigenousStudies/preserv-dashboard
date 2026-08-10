import type { ReactElement } from 'react'
import NextLink from 'next/link'
import {
  BookOpen,
  ClipboardList,
  Database,
  Egg,
  FileText,
  FolderTree,
  FolderInput,
  LayoutDashboard,
  Library,
  MessageCircleWarning,
  Tag,
  SquareLibrary,
  Puzzle,
} from 'lucide-react'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material'

import type { DashboardNavigationIconKey, DashboardNavigationSection } from '@constants/navigation'

interface NavSectionProps {
  activePathname: string
  onNavigate?: () => void
  section: DashboardNavigationSection
}

const navigationIconMap: Record<DashboardNavigationIconKey, typeof Library> = {
  batches: Egg,
  collections: SquareLibrary,
  componentLibrary: Puzzle,
  dashboard: LayoutDashboard,
  db: Database,
  documents: FileText,
  exclusionReview: FolderTree,
  library: Library,
  process: FolderInput,
  readyForLibrary: BookOpen,
  reports: MessageCircleWarning,
  reviewQueue: ClipboardList,
  tags: Tag,
}

export function NavSection({ activePathname, onNavigate, section }: NavSectionProps): ReactElement {
  return (
    <Box>
      <Typography
        variant={'overline'}
        sx={{
          color: 'text.secondary',
          display: 'block',
          letterSpacing: '0.16em',
          mb: 1,
          px: 2,
        }}
      >
        {section.label}
      </Typography>
      <List disablePadding sx={{ display: 'grid', gap: 0.5 }}>
        {section.items.map((item) => {
          const Icon = navigationIconMap[item.iconKey]
          const isActive = activePathname === item.href

          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                aria-current={isActive ? 'page' : undefined}
                component={NextLink}
                href={item.href}
                onClick={onNavigate}
                selected={isActive}
              >
                <ListItemIcon>
                  <Icon size={18} />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )
}
