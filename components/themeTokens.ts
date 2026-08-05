export interface DashboardBrandTokens {
  white: string
  charcoal: string
  orange: string
  orangeHover: string
  sage: string
  sageDark: string
  blue: string
  coral: string
  neutral: string
  brightOrange: string
}

export interface DashboardSemanticTokens {
  surface: {
    canvas: string
    page: string
    panel: string
    subtle: string
    selected: string
    inverse: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    disabled: string
    inverse: string
  }
  border: {
    default: string
    subtle: string
    strong: string
    focus: string
  }
  action: {
    primary: string
    primaryHover: string
    secondary: string
    secondaryHover: string
    selected: string
    selectedHover: string
    danger: string
  }
  status: {
    success: { main: string; background: string; border: string; text: string }
    warning: { main: string; background: string; border: string; text: string }
    error: { main: string; background: string; border: string; text: string }
    info: { main: string; background: string; border: string; text: string }
  }
}

export const dashboardBrandTokens: DashboardBrandTokens = {
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
}

export const dashboardSemanticTokens: DashboardSemanticTokens = {
  surface: {
    canvas: '#f0f0f0',
    page: dashboardBrandTokens.white,
    panel: dashboardBrandTokens.white,
    subtle: dashboardBrandTokens.neutral,
    selected: 'rgba(148, 217, 248, 0.24)',
    inverse: dashboardBrandTokens.charcoal,
  },
  text: {
    primary: dashboardBrandTokens.charcoal,
    secondary: 'rgba(51, 51, 51, 0.7)',
    muted: 'rgba(51, 51, 51, 0.6)',
    disabled: 'rgba(51, 51, 51, 0.3)',
    inverse: dashboardBrandTokens.white,
  },
  border: {
    default: 'rgba(141, 147, 109, 0.25)',
    subtle: 'rgba(141, 147, 109, 0.15)',
    strong: 'rgba(141, 147, 109, 0.45)',
    focus: dashboardBrandTokens.orange,
  },
  action: {
    primary: dashboardBrandTokens.orange,
    primaryHover: dashboardBrandTokens.orangeHover,
    secondary: dashboardBrandTokens.neutral,
    secondaryHover: dashboardBrandTokens.blue,
    selected: dashboardBrandTokens.brightOrange,
    selectedHover: '#e56830',
    danger: dashboardBrandTokens.coral,
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
      main: dashboardBrandTokens.coral,
      background: '#fae0dc',
      border: '#e9b4a9',
      text: '#be3019',
    },
    info: {
      main: dashboardBrandTokens.blue,
      background: 'rgba(148, 217, 248, 0.24)',
      border: 'rgba(148, 217, 248, 0.6)',
      text: dashboardBrandTokens.charcoal,
    },
  },
}
