'use client'

import type { ReactElement } from 'react'
import { usePathname } from 'next/navigation'
import { Box, Stack, Typography } from '@mui/material'

import {
  BATCHES_PATH,
  COLLECTIONS_PATH,
  COMPONENT_LIBRARY_PATH,
  DASHBOARD_PATH,
  DB_SCHEMA_PATH,
  DOCUMENTS_PATH,
  FAILED_PATH,
  PROCESS_DOCUMENTS_PATH,
  REVIEW_QUEUE_PATH,
  READY_FOR_LIBRARY_PATH,
} from '@constants/paths'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

interface AppShellHeaderProps {
  onOpenNavigation: () => void
}

interface ShellRouteMetadata {
  description: string
  title: string
}

const routeMetadataByPath: Record<string, ShellRouteMetadata> = {
  [DASHBOARD_PATH]: {
    title: 'Dashboard',
    description: 'Shared operational shell frame for preservation workflows and supporting tools.',
  },
  [DOCUMENTS_PATH]: {
    title: 'Documents',
    description: 'Existing documents index behavior remains unchanged in this shell slice.',
  },
  [PROCESS_DOCUMENTS_PATH]: {
    title: 'Process',
    description: 'Launch and monitor document processing workflows from the existing route.',
  },
  [BATCHES_PATH]: {
    title: 'Batches',
    description: 'Monitor recent processing batches and their current execution state.',
  },
  [REVIEW_QUEUE_PATH]: {
    title: 'Review Queue',
    description: 'Continue the current document review workflow from the shared shell.',
  },
  [READY_FOR_LIBRARY_PATH]: {
    title: 'Ready for Library',
    description: 'Review the current library-ready list within the shared shell frame.',
  },
  [COLLECTIONS_PATH]: {
    title: 'Collections',
    description: 'Browse the existing collections workspace without changing route behavior.',
  },
  [FAILED_PATH]: {
    title: 'Failures',
    description: 'Inspect the existing failures view from the shared shell.',
  },
  [DB_SCHEMA_PATH]: {
    title: 'DB',
    description: 'Open the existing database reference route from the shared shell.',
  },
  [COMPONENT_LIBRARY_PATH]: {
    title: 'Component Library',
    description: 'Access the current component library route from the shared shell.',
  },
}

function titleizePathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return 'Dashboard'
  }

  return segments[0]
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function AppShellHeader({ onOpenNavigation }: AppShellHeaderProps): ReactElement {
  const pathname = usePathname()
  const metadata = routeMetadataByPath[pathname] ?? {
    title: titleizePathname(pathname),
    description: 'This route is mounted inside the shared preservation dashboard shell.',
  }

  return (
    <Box
      component="header"
      sx={{
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        px: { xs: 2, md: 3, lg: 4 },
        py: 2,
        top: 0,
        zIndex: 1200,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          margin: '0 auto',
          maxWidth: '80rem',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', width: '100%' }}>
          <Box sx={{ display: { md: 'none' } }}>
            <SidebarVisibilityControl intent="open" surface="mobileBar" onClick={onOpenNavigation} />
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
              Preservation Shell
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {metadata.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
              {metadata.description}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
}
