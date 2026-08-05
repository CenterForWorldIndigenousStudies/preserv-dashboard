import { describe, expect, it } from 'vitest'

import { dashboardBrandTokens, dashboardSemanticTokens } from '@components/themeTokens'

describe('dashboard theme tokens', () => {
  it('exposes the approved CWIS brand primitives', () => {
    expect(dashboardBrandTokens).toEqual({
      white: '#ffffff',
      charcoal: '#333333',
      orange: '#cc5a25',
      orangeHover: '#954300',
      sage: '#8d936d',
      sageDark: '#555941',
      blue: '#94d9f8',
      coral: '#e96954',
      neutral: '#f2f2f2',
      brightOrange: '#ff7637',
    })
  })

  it('derives the approved CWIS semantic values', () => {
    expect(dashboardSemanticTokens).toEqual({
      surface: {
        canvas: '#f0f0f0',
        page: '#ffffff',
        panel: '#ffffff',
        subtle: '#f2f2f2',
        selected: 'rgba(148, 217, 248, 0.24)',
        inverse: '#333333',
      },
      text: {
        primary: '#333333',
        secondary: 'rgba(51, 51, 51, 0.7)',
        muted: 'rgba(51, 51, 51, 0.6)',
        disabled: 'rgba(51, 51, 51, 0.3)',
        inverse: '#ffffff',
      },
      border: {
        default: 'rgba(141, 147, 109, 0.25)',
        subtle: 'rgba(141, 147, 109, 0.15)',
        strong: 'rgba(141, 147, 109, 0.45)',
        focus: '#cc5a25',
      },
      action: {
        primary: '#cc5a25',
        primaryHover: '#954300',
        secondary: '#f2f2f2',
        secondaryHover: '#94d9f8',
        selected: '#ff7637',
        selectedHover: '#e56830',
        danger: '#e96954',
      },
      status: {
        success: {
          main: '#2b7731',
          background: '#eaf4eb',
          border: '#94d9ac',
          text: '#2b7731',
        },
        warning: {
          main: '#c85a00',
          background: '#fff4e8',
          border: '#f0c08a',
          text: '#954300',
        },
        error: {
          main: '#e96954',
          background: '#fae0dc',
          border: '#e9b4a9',
          text: '#be3019',
        },
        info: {
          main: '#94d9f8',
          background: 'rgba(148, 217, 248, 0.24)',
          border: 'rgba(148, 217, 248, 0.6)',
          text: '#333333',
        },
      },
    })
  })
})
