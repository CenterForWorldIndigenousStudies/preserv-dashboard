import { describe, expect, it } from 'vitest'

import theme from '@components/theme'

describe('dashboard MUI theme', () => {
  it('exposes semantic palette roles without visual color names', () => {
    expect(theme.palette.background.default).toBe('#ffffff')
    expect(theme.palette.background.paper).toBe('#ffffff')
    expect(theme.palette.text.primary).toBe('#333333')
    expect(theme.palette.primary.main).toBe('#cc5a25')
    expect(theme.palette.primary.contrastText).toBe('#ffffff')
    expect(theme.palette.error.main).toBe('#e96954')
    expect(theme.palette.surface.canvas).toBe('#f0f0f0')
    expect(theme.palette.surface.panel).toBe('#ffffff')
    expect(theme.palette.surface.page).toBe('#ffffff')
    expect(theme.palette.border.default).toBe('rgba(141, 147, 109, 0.25)')
    expect(theme.palette.border.subtle).toBe('rgba(141, 147, 109, 0.15)')
  })

  it('enables generated CSS variables for the theme', () => {
    const runtimeTheme = theme as typeof theme & {
      cssVarPrefix: string
      vars: { palette: { primary: { main: string } } }
    }

    expect(runtimeTheme.cssVarPrefix).toBe('cwis')
    expect(runtimeTheme.vars.palette.primary.main).toContain('var(--cwis-palette-primary-main')
  })

  it('owns reusable component styling at the theme boundary', () => {
    expect(theme.components?.MuiButton?.styleOverrides?.root).toBeDefined()
    expect(theme.components?.MuiPaper?.defaultProps?.elevation).toBe(0)
    expect(theme.components?.MuiTextField?.styleOverrides?.root).toBeDefined()
    expect(theme.components?.MuiListItemButton?.styleOverrides?.root).toBeDefined()
  })

  it('uses inverse text for selected sidebar navigation buttons', () => {
    expect(theme.components?.MuiListItemButton?.styleOverrides?.root).toMatchObject({
      '&.Mui-selected': {
        backgroundColor: '#ff7637',
        color: '#ffffff',
      },
    })
  })

  it('styles contained primary buttons with the primary action role', () => {
    const primaryButtonVariant = theme.components?.MuiButton?.variants?.find(
      (variant) => variant.props?.variant === 'contained' && variant.props?.color === 'primary',
    )

    expect(primaryButtonVariant?.style).toMatchObject({
      backgroundColor: '#cc5a25',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#954300',
        color: '#ffffff',
      },
    })
  })
})
