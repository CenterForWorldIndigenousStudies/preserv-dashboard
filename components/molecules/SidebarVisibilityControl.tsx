'use client'

import type { ReactElement } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import { IconButton } from '@mui/material'
import { Menu, PanelLeft, PanelLeftClose, X } from 'lucide-react'

import { SIDEBAR_CONTROL_LABELS } from '@constants/sidebar'

export type SidebarVisibilityIntent = 'open' | 'close'
export type SidebarVisibilitySurface = 'mobileBar' | 'sidebarHeader' | 'desktopRail'

export interface SidebarVisibilityControlProps {
  intent: SidebarVisibilityIntent
  surface: SidebarVisibilitySurface
  onClick: () => void
}

interface ControlConfig {
  icon: ReactElement
  label: string
  size: 'small' | 'medium'
  sx: SxProps<Theme>
}

function getDesktopRailSx(): SxProps<Theme> {
  return {
    height: 38,
    width: 22,
    borderRadius: '0 10px 10px 0',
    backgroundColor: 'primary.main',
    boxShadow: 1,
    color: 'primary.contrastText',
    px: 0.5,
    py: 1,
    '&:hover': {
      backgroundColor: 'primary.main',
      opacity: 0.85,
    },
  }
}

function getControlConfig(intent: SidebarVisibilityIntent, surface: SidebarVisibilitySurface): ControlConfig {
  if (intent === 'open' && surface === 'mobileBar') {
    return {
      icon: <Menu size={24} />,
      label: SIDEBAR_CONTROL_LABELS.openNavigation,
      size: 'medium',
      sx: {
        borderRadius: 2,
        backgroundColor: 'background.default',
        color: 'text.primary',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      },
    }
  }

  if (intent === 'close' && surface === 'sidebarHeader') {
    return {
      icon: <X size={20} />,
      label: SIDEBAR_CONTROL_LABELS.closeNavigation,
      size: 'small',
      sx: {
        color: 'text.primary',
        alignSelf: 'flex-end',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      },
    }
  }

  if (intent === 'open' && surface === 'desktopRail') {
    return {
      icon: <PanelLeft size={14} />,
      label: SIDEBAR_CONTROL_LABELS.showSidebar,
      size: 'small',
      sx: { ...getDesktopRailSx() },
    }
  }

  if (intent === 'close' && surface === 'desktopRail') {
    return {
      icon: <PanelLeftClose size={14} />,
      label: SIDEBAR_CONTROL_LABELS.hideSidebar,
      size: 'small',
      sx: getDesktopRailSx(),
    }
  }

  throw new Error(`Unsupported sidebar visibility control combination: ${surface}-${intent}`)
}

export function SidebarVisibilityControl({ intent, surface, onClick }: SidebarVisibilityControlProps): ReactElement {
  const config = getControlConfig(intent, surface)

  return (
    <IconButton
      aria-label={config.label}
      onClick={onClick}
      size={config.size}
      sx={config.sx}
      title={config.label}
      type={'button'}
    >
      {config.icon}
    </IconButton>
  )
}
