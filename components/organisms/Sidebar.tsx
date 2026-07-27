'use client'

import { usePathname } from 'next/navigation'
import { Box, Drawer, Stack, type SxProps, type Theme } from '@mui/material'

import { AppVersion } from '@atoms/AppVersion'
import { SidebarHeader } from '@atoms/SidebarHeader'
import {
  DASHBOARD_NAVIGATION_SECTIONS,
  type DashboardNavigationSection,
} from '@constants/navigation'
import {
  BATCHES_PATH,
  COLLECTIONS_PATH,
  COMPONENT_LIBRARY_PATH,
  DASHBOARD_PATH,
  DB_SCHEMA_PATH,
  DOCUMENTS_PATH,
  EXCLUSION_REVIEW_PATH,
  FAILED_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
  REPORTS_PAGE_PATH,
  REVIEW_QUEUE_PATH,
  TAGS_PAGE_PATH,
} from '@constants/paths'
import AuthStatus from '@molecules/AuthStatus'
import { NavSection } from '@molecules/NavSection'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

export type SidebarVariant = 'desktop' | 'mobile'

const mobileDrawerLabel = 'Preservation Pipeline navigation'

interface SidebarProps {
  variant: SidebarVariant
  isOpen?: boolean
  onClose?: () => void
}

interface SidebarLayoutStyles {
  nav: SxProps<Theme>
  panel: SxProps<Theme>
  root: SxProps<Theme>
}

const visibleNavigationHrefs = new Set<string>([
  DASHBOARD_PATH,
  DOCUMENTS_PATH,
  PROCESS_DOCUMENTS_PATH,
  BATCHES_PATH,
  EXCLUSION_REVIEW_PATH,
  REVIEW_QUEUE_PATH,
  READY_FOR_LIBRARY_PATH,
  COLLECTIONS_PATH,
  TAGS_PAGE_PATH,
  REPORTS_PAGE_PATH,
  FAILED_PATH,
  DB_SCHEMA_PATH,
  COMPONENT_LIBRARY_PATH,
])

function getVisibleSections(): DashboardNavigationSection[] {
  return DASHBOARD_NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => visibleNavigationHrefs.has(item.href)),
  })).filter((section) => section.items.length > 0)
}

export function getSidebarLayoutStyles(variant: SidebarVariant): SidebarLayoutStyles {
  const isMobile = variant === 'mobile'

  return {
    root: isMobile
      ? {
          height: '100%',
        }
      : {
          alignSelf: 'flex-start',
          height: '100dvh',
          position: 'sticky',
          top: 0,
        },
    panel: {
      bgcolor: 'sand.main',
      borderColor: 'divider',
      borderRight: isMobile ? undefined : '1px solid',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: '100dvh',
      overflow: 'hidden',
      width: 280,
    },
    nav: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      px: 2,
      py: 3,
    },
  }
}

export default function Sidebar({ variant, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const isMobile = variant === 'mobile'
  const sections = getVisibleSections()
  const layoutStyles = getSidebarLayoutStyles(variant)

  const sidebarContent = (
    <Box sx={layoutStyles.panel}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, py: 2 }}>
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
          title="Preservation Pipeline"
        />
      </Box>

      <Stack spacing={3} sx={layoutStyles.nav}>
        {sections.map((section) => (
          <NavSection
            key={section.id}
            activePathname={pathname}
            onNavigate={isMobile ? onClose : undefined}
            section={section}
          />
        ))}
      </Stack>

      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
        <Box sx={{ px: 1 }}>
          <AuthStatus />
        </Box>
        <Box sx={{ mt: 1, px: 1 }}>
          <AppVersion />
        </Box>
      </Box>
    </Box>
  )

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        ModalProps={{ keepMounted: true }}
        onClose={onClose}
        open={Boolean(isOpen)}
        slotProps={{
          paper: {
            'aria-label': mobileDrawerLabel,
          },
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    )
  }

  return <Box sx={layoutStyles.root}>{sidebarContent}</Box>
}
