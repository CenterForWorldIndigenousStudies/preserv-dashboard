'use client'

import type { ReactElement } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import { IconButton } from '@mui/material'
import { Menu, PanelLeft, PanelLeftClose, X } from 'lucide-react'

export type SidebarVisibilityIntent = 'open' | 'close'
export type SidebarVisibilitySurface = 'mobileBar' | 'sidebarHeader' | 'desktopRail'

export interface SidebarVisibilityControlProps {
  intent: SidebarVisibilityIntent
  surface: SidebarVisibilitySurface
  onClick: () => void
}

interface ControlConfig {
  ariaLabel: string
  icon: ReactElement
  size: 'small' | 'medium'
  sx: SxProps<Theme>
  title: string
}

function getDesktopRailSx(): SxProps<Theme> {
  return {
    height: 38,
    width: 22,
    borderRadius: '0 10px 10px 0',
    backgroundColor: 'moss.main',
    boxShadow: 1,
    color: 'moss.contrastText',
    px: 0.5,
    py: 1,
    '&:hover': {
      backgroundColor: 'moss.main',
      opacity: 0.85,
    },
  }
}

function getControlConfig(
  intent: SidebarVisibilityIntent,
  surface: SidebarVisibilitySurface,
): ControlConfig {
  if (intent === 'open' && surface === 'mobileBar') {
    return {
      ariaLabel: 'Open navigation menu',
      icon: <Menu size={24} />,
      size: 'medium',
      sx: {
        borderRadius: 2,
        backgroundColor: 'sand.main',
        color: 'ink.main',
        '&:hover': {
          backgroundColor: 'sky.main',
        },
      },
      title: 'Open navigation menu',
    }
  }

  if (intent === 'close' && surface === 'sidebarHeader') {
    return {
      ariaLabel: 'Close navigation menu',
      icon: <X size={20} />,
      size: 'small',
      sx: {
        color: 'ink.main',
        '&:hover': {
          backgroundColor: 'sky.main',
        },
      },
      title: 'Close navigation menu',
    }
  }

  if (intent === 'open' && surface === 'desktopRail') {
    return {
      ariaLabel: 'Show sidebar',
      icon: <PanelLeft size={14} />,
      size: 'small',
      sx: {...getDesktopRailSx()},
      title: 'Show sidebar',
    }
  }

  if (intent === 'close' && surface === 'desktopRail') {
    return {
      ariaLabel: 'Hide sidebar',
      icon: <PanelLeftClose size={14} />,
      size: 'small',
      sx: getDesktopRailSx(),
      title: 'Hide sidebar',
    }
  }

  throw new Error(`Unsupported sidebar visibility control combination: ${surface}-${intent}`)
}

export function SidebarVisibilityControl({
  intent,
  surface,
  onClick,
}: SidebarVisibilityControlProps): ReactElement {
  const config = getControlConfig(intent, surface)

  return (
    <IconButton
      aria-label={config.ariaLabel}
      onClick={onClick}
      size={config.size}
      sx={config.sx}
      title={config.title}
      type="button"
    >
      {config.icon}
    </IconButton>
  )
}
