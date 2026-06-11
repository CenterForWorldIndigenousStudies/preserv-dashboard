'use client'

import type { ReactElement } from 'react'
import { usePathname } from 'next/navigation'
import { Box, Stack, Typography } from '@mui/material'

import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

interface AppShellHeaderProps {
  onOpenNavigation: () => void
}

interface ShellRouteMetadata {
  description: string
  title: string
}

const routeMetadataByPath: Record<string, ShellRouteMetadata> = {
  '/': {
    title: 'Overview',
    description: 'Existing documents index behavior remains unchanged in this shell slice.',
  },
  '/dashboard': {
    title: 'Dashboard',
    description: 'Shared operational shell frame for preservation workflows and supporting tools.',
  },
  '/process-documents': {
    title: 'Process',
    description: 'Launch and monitor document processing workflows from the existing route.',
  },
  '/batches': {
    title: 'Batches',
    description: 'Monitor recent processing batches and their current execution state.',
  },
  '/batch-summary': {
    title: 'Batch Summary',
    description: 'Existing direct route for batch-level summary details remains available.',
  },
  '/review-queue': {
    title: 'Review Queue',
    description: 'Continue the current document review workflow from the shared shell.',
  },
  '/ready-for-library': {
    title: 'Ready for Library',
    description: 'Review the current library-ready list within the shared shell frame.',
  },
  '/collections': {
    title: 'Collections',
    description: 'Browse the existing collections workspace without changing route behavior.',
  },
  '/failures': {
    title: 'Failures',
    description: 'Inspect the existing failures view from the shared shell.',
  },
  '/db': {
    title: 'DB',
    description: 'Open the existing database reference route from the shared shell.',
  },
  '/component-library': {
    title: 'Component Library',
    description: 'Access the current component library route from the shared shell.',
  },
}

function titleizePathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return 'Overview'
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
