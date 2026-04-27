// True Deal · Brand Tokens
// Single source of truth for all visual values.

export const colors = {
  primary:      '#16A34A',
  primaryDark:  '#0D4F2F',
  primaryLight: '#DCFCE7',
  primaryMid:   '#22C55E',

  bg: {
    base:    '#0D0D14',
    surface: '#14141F',
    elevated:'#1A1A2E',
    success: '#142E14',
    warning: '#2E2A14',
  },

  text: {
    primary:   '#EEEEFF',
    secondary: '#5050A0',
    success:   '#3DBF6A',
    warning:   '#C09040',
    danger:    '#FF4A4A',
  },

  border: {
    default: '#2A2A3A',
    subtle:  '#1A1A2E',
    focus:   '#16A34A',
    success: '#2A5A2A',
  },

  danger: '#FF4A4A',
  white:  '#FFFFFF',
  dark:   '#0D0D14',
}

export const radius = {
  card:   14,
  pill:   100,
  button: 12,
  icon:   18,
  badge:  100,
}

export const spacing = {
  screen:  24,
  card:    14,
  section: 16,
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40,
}

export const typography = {
  family: 'Inter',
  weights: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  sizes: { h1: 22, h2: 17, body: 14, label: 11, caption: 10, button: 15 },
}

export const brand = { colors, radius, spacing, typography }
export default brand
