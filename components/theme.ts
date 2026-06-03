'use client'

import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    ink: Palette['primary']
    sand: Palette['primary']
    clay: Palette['primary']
    sky: Palette['primary']
    accent: Palette['primary']
    moss: Palette['primary']
  }
  interface PaletteOptions {
    ink?: PaletteOptions['primary']
    sand?: PaletteOptions['primary']
    clay?: PaletteOptions['primary']
    sky?: PaletteOptions['primary']
    accent?: PaletteOptions['primary']
    moss?: PaletteOptions['primary']
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#355834', // moss green - primary CWIS color
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f4f1f0', // sand - warm off-white background
      contrastText: '#231f20', // ink
    },
    ink: {
      main: '#231f20', // deep charcoal - primary text
      contrastText: '#ffffff',
    },
    sand: {
      main: '#f4f1f0', // warm off-white
      contrastText: '#231f20',
    },
    clay: {
      main: '#e96954', // earthy clay red
      contrastText: '#ffffff',
    },
    sky: {
      main: '#94d9f8', // light sky blue
      contrastText: '#231f20',
    },
    accent: {
      main: '#ff7637', // orange CTA accent
      contrastText: '#ffffff',
    },
    moss: {
      main: '#355834', // moss green
      contrastText: '#ffffff',
    },
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
          '--mui-palette-primary-main': '#355834',
          '--mui-palette-secondary-main': '#f4f1f0',
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
              backgroundColor: '#2a4729',
            },
          },
        },
        {
          props: { variant: 'outlined' },
          style: {
            boxShadow: 'none',
            backgroundColor: '#f4f1f0',
            color: '#231f20',
            borderColor: '#231f20',
            '&:hover': {
              backgroundColor: '#94d9f8',
              color: '#231f20',
              borderColor: '#231f20',
            },
          },
        },
        {
          props: { variant: 'text' },
          style: {
            boxShadow: 'none',
            color: 'rgba(35, 31, 32, 0.7)',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: '#f4f1f0',
              color: '#231f20',
            },
          },
        },
        {
          props: { variant: 'contained' as const, color: 'primary' },
          style: {
            backgroundColor: '#ff7637', // accent orange CTA
            color: '#231f20',
            '&:hover': {
              backgroundColor: '#e56830',
              color: '#231f20',
            },
          },
        },
      ],
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#f4f1f0',
          borderRight: '1px solid rgba(35, 31, 32, 0.08)',
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
          boxShadow: '0 2px 8px rgba(35, 31, 32, 0.06)',
          border: '1px solid rgba(35, 31, 32, 0.08)',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: '1px solid rgba(35, 31, 32, 0.1)',
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
          color: 'rgba(35, 31, 32, 0.4)',
          '&.Mui-checked': {
            color: '#355834',
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
            backgroundColor: 'rgba(148, 217, 248, 0.24)',
          },
          '&.Mui-selected': {
            backgroundColor: '#355834',
            color: '#ffffff',
          },
          '&.Mui-selected:hover': {
            backgroundColor: '#2a4729',
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
