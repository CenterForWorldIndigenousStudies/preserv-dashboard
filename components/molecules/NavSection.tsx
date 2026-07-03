import type { ReactElement } from 'react'
import NextLink from 'next/link'
import {
  BookOpen,
  ClipboardList,
  Database,
  FolderInput,
  House,
  LayoutDashboard,
} from 'lucide-react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'

import type { DashboardNavigationIconKey, DashboardNavigationSection } from '@constants/navigation'

interface NavSectionProps {
  activePathname: string
  onNavigate?: () => void
  section: DashboardNavigationSection
}

const navigationIconMap: Record<DashboardNavigationIconKey, typeof House> = {
  dashboard: LayoutDashboard,
  documents: BookOpen,
  process: FolderInput,
  batches: Database,
  reviewQueue: ClipboardList,
  readyForLibrary: BookOpen,
  collections: BookOpen,
  tags: BookOpen,
  reports: Database,
  db: Database,
  componentLibrary: BookOpen,
}

export function NavSection({ activePathname, onNavigate, section }: NavSectionProps): ReactElement {
  return (
    <Box>
      <Typography
        variant="overline"
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
