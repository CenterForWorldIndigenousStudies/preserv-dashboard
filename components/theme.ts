'use client'

import { alpha, createTheme } from '@mui/material/styles'

import { dashboardBrandTokens, dashboardSemanticTokens } from './themeTokens'

interface DashboardSurfacePalette {
  canvas: string
  page: string
  panel: string
  subtle: string
  selected: string
  inverse: string
}

interface DashboardBorderPalette {
  default: string
  subtle: string
  strong: string
  focus: string
}

declare module '@mui/material/styles' {
  interface TypeText {
    inverse: string
  }

  interface TypeAction {
    primary: string
    primaryHover: string
    secondary: string
    secondaryHover: string
    selectedBackground: string
    selectedHoverBackground: string
    danger: string
  }

  interface Palette {
    surface: DashboardSurfacePalette
    border: DashboardBorderPalette
  }
  interface PaletteOptions {
    surface?: DashboardSurfacePalette
    border?: DashboardBorderPalette
  }
}

const theme = createTheme({
  cssVariables: {
    cssVarPrefix: 'cwis',
  },
  palette: {
    primary: {
      main: dashboardSemanticTokens.action.primary,
      contrastText: dashboardBrandTokens.white,
    },
    secondary: {
      main: dashboardSemanticTokens.action.secondary,
      contrastText: dashboardSemanticTokens.text.primary,
    },
    background: {
      default: dashboardSemanticTokens.surface.page,
      paper: dashboardSemanticTokens.surface.panel,
    },
    text: {
      primary: dashboardSemanticTokens.text.primary,
      secondary: dashboardSemanticTokens.text.secondary,
      disabled: dashboardSemanticTokens.text.disabled,
      inverse: dashboardSemanticTokens.text.inverse,
    },
    divider: dashboardSemanticTokens.border.default,
    error: {
      main: dashboardSemanticTokens.status.error.main,
      light: dashboardSemanticTokens.status.error.background,
      dark: dashboardSemanticTokens.status.error.text,
      contrastText: dashboardBrandTokens.white,
    },
    warning: {
      main: dashboardSemanticTokens.status.warning.main,
      light: dashboardSemanticTokens.status.warning.background,
      dark: dashboardSemanticTokens.status.warning.text,
      contrastText: dashboardBrandTokens.white,
    },
    info: {
      main: dashboardSemanticTokens.status.info.main,
      light: dashboardSemanticTokens.status.info.background,
      dark: dashboardSemanticTokens.status.info.text,
      contrastText: dashboardSemanticTokens.text.primary,
    },
    success: {
      main: dashboardSemanticTokens.status.success.main,
      light: dashboardSemanticTokens.status.success.background,
      dark: dashboardSemanticTokens.status.success.text,
      contrastText: dashboardBrandTokens.white,
    },
    action: {
      primary: dashboardSemanticTokens.action.primary,
      primaryHover: dashboardSemanticTokens.action.primaryHover,
      secondary: dashboardSemanticTokens.action.secondary,
      secondaryHover: dashboardSemanticTokens.action.secondaryHover,
      selectedBackground: dashboardSemanticTokens.action.selected,
      selectedHoverBackground: dashboardSemanticTokens.action.selectedHover,
      danger: dashboardSemanticTokens.action.danger,
    },
    surface: dashboardSemanticTokens.surface,
    border: dashboardSemanticTokens.border,
  },
  typography: {
    // Primary: Rethink Sans - matching cwis.org display font
    fontFamily: '"Rethink Sans", "Work Sans", sans-serif',
    h1: {
      fontFamily: '"Rethink Sans", "Work Sans", sans-serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: '"Rethink Sans", "Work Sans", sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: '"Rethink Sans", "Work Sans", sans-serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: '"Rethink Sans", "Work Sans", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"Rethink Sans", "Work Sans", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: '"Rethink Sans", "Work Sans", sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    // Body uses Work Sans as secondary
    body1: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    // UI labels use Work Sans
    button: {
      fontFamily: '"Work Sans", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
    caption: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: '0.75rem',
      letterSpacing: '0.05em',
    },
    overline: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--cwis-surface-page': dashboardSemanticTokens.surface.page,
          '--cwis-surface-panel': dashboardSemanticTokens.surface.panel,
          '--cwis-surface-subtle': dashboardSemanticTokens.surface.subtle,
          '--cwis-surface-selected': dashboardSemanticTokens.surface.selected,
          '--cwis-surface-inverse': dashboardSemanticTokens.surface.inverse,
          '--cwis-text-primary': dashboardSemanticTokens.text.primary,
          '--cwis-text-secondary': dashboardSemanticTokens.text.secondary,
          '--cwis-text-muted': dashboardSemanticTokens.text.muted,
          '--cwis-text-disabled': dashboardSemanticTokens.text.disabled,
          '--cwis-text-inverse': dashboardSemanticTokens.text.inverse,
          '--cwis-border-default': dashboardSemanticTokens.border.default,
          '--cwis-border-subtle': dashboardSemanticTokens.border.subtle,
          '--cwis-border-strong': dashboardSemanticTokens.border.strong,
          '--cwis-border-focus': dashboardSemanticTokens.border.focus,
          '--cwis-action-primary': dashboardSemanticTokens.action.primary,
          '--cwis-action-primary-hover': dashboardSemanticTokens.action.primaryHover,
          '--cwis-action-secondary': dashboardSemanticTokens.action.secondary,
          '--cwis-action-secondary-hover': dashboardSemanticTokens.action.secondaryHover,
          '--cwis-action-selected': dashboardSemanticTokens.action.selected,
          '--cwis-action-selected-hover': dashboardSemanticTokens.action.selectedHover,
          '--cwis-action-danger': dashboardSemanticTokens.action.danger,
          '--cwis-status-success-main': dashboardSemanticTokens.status.success.main,
          '--cwis-status-success-background': dashboardSemanticTokens.status.success.background,
          '--cwis-status-success-border': dashboardSemanticTokens.status.success.border,
          '--cwis-status-success-text': dashboardSemanticTokens.status.success.text,
          '--cwis-status-warning-main': dashboardSemanticTokens.status.warning.main,
          '--cwis-status-warning-background': dashboardSemanticTokens.status.warning.background,
          '--cwis-status-warning-border': dashboardSemanticTokens.status.warning.border,
          '--cwis-status-warning-text': dashboardSemanticTokens.status.warning.text,
          '--cwis-status-error-main': dashboardSemanticTokens.status.error.main,
          '--cwis-status-error-background': dashboardSemanticTokens.status.error.background,
          '--cwis-status-error-border': dashboardSemanticTokens.status.error.border,
          '--cwis-status-error-text': dashboardSemanticTokens.status.error.text,
          '--cwis-status-info-main': dashboardSemanticTokens.status.info.main,
          '--cwis-status-info-background': dashboardSemanticTokens.status.info.background,
          '--cwis-status-info-border': dashboardSemanticTokens.status.info.border,
          '--cwis-status-info-text': dashboardSemanticTokens.status.info.text,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          px: 4,
          py: 1.5,
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none' as const,
          transition: 'background-color 0.2s, color 0.2s',
        },
      },
      variants: [
        {
          props: { variant: 'contained' },
          style: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              backgroundColor: dashboardSemanticTokens.action.primaryHover,
            },
          },
        },
        {
          props: { variant: 'outlined' },
          style: {
            boxShadow: 'none',
            backgroundColor: dashboardSemanticTokens.action.secondary,
            color: dashboardSemanticTokens.text.primary,
            borderColor: dashboardSemanticTokens.border.focus,
            '&:hover': {
              backgroundColor: dashboardSemanticTokens.action.secondaryHover,
              color: dashboardSemanticTokens.text.primary,
              borderColor: dashboardSemanticTokens.border.focus,
            },
          },
        },
        {
          props: { variant: 'text' },
          style: {
            boxShadow: 'none',
            color: dashboardSemanticTokens.text.secondary,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: dashboardSemanticTokens.action.secondary,
              color: dashboardSemanticTokens.text.primary,
            },
          },
        },
        {
          props: { variant: 'contained' as const, color: 'primary' },
          style: {
            backgroundColor: dashboardSemanticTokens.action.primary,
            color: dashboardSemanticTokens.text.inverse,
            '&:hover': {
              backgroundColor: dashboardSemanticTokens.action.primaryHover,
              color: dashboardSemanticTokens.text.inverse,
            },
          },
        },
      ],
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: dashboardSemanticTokens.surface.page,
          borderRight: `1px solid ${alpha(dashboardSemanticTokens.text.primary, 0.08)}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: `0 2px 8px ${alpha(dashboardSemanticTokens.text.primary, 0.06)}`,
          border: `1px solid ${alpha(dashboardSemanticTokens.text.primary, 0.08)}`,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: `1px solid ${alpha(dashboardSemanticTokens.text.primary, 0.1)}`,
          '&::before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: 0,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 48,
          '&.Mui-expanded': {
            minHeight: 48,
          },
        },
        content: {
          '&.Mui-expanded': {
            margin: '12px 0',
          },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: '0 16px 16px',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: alpha(dashboardSemanticTokens.text.primary, 0.4),
          '&.Mui-checked': {
            color: dashboardSemanticTokens.action.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          paddingInline: 16,
          '&:hover': {
            backgroundColor: dashboardSemanticTokens.surface.selected,
          },
          '&.Mui-selected': {
            backgroundColor: dashboardSemanticTokens.action.selected,
            color: dashboardSemanticTokens.text.inverse,
          },
          '&.Mui-selected:hover': {
            backgroundColor: dashboardSemanticTokens.action.selectedHover,
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: 'inherit',
          minWidth: 36,
        },
      },
    },
    MuiStack: {
      defaultProps: {
        useFlexGap: true,
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontFamily: '"Work Sans", sans-serif',
          fontWeight: 500,
          '&.Mui-active': {
            fontWeight: 600,
          },
          '&.Mui-completed': {
            fontWeight: 500,
          },
        },
      },
    },
  },
})

export default theme
