'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Causeway MUI theme — deliberately subtle.
 *
 * Design language (inspired by the reference HRM app):
 *  - Monochrome neutral palette: near-white canvas, white surfaces, hairline borders
 *  - Near-black primary used sparingly (buttons, links, active nav)
 *  - Semantic colors reserved for status only (success / warning / error)
 *  - Generous whitespace, calm typography, no heavy shadows or gradients
 *  - Rounded but not pill-shaped controls
 */

const palette = {
  primary: { main: '#1c1c1c', light: '#3a3a3a', dark: '#000000', contrastText: '#ffffff' },
  secondary: { main: '#71717a', light: '#a1a1aa', dark: '#52525b', contrastText: '#ffffff' },
  success: { main: '#059669', light: '#10b981', dark: '#047857', contrastText: '#ffffff' },
  warning: { main: '#d97706', light: '#f59e0b', dark: '#b45309', contrastText: '#ffffff' },
  error: { main: '#dc2626', light: '#ef4444', dark: '#b91c1c', contrastText: '#ffffff' },
  info: { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8', contrastText: '#ffffff' },
  text: {
    primary: '#1a1a1a',
    secondary: '#71717a',
    disabled: '#a1a1aa',
  },
  background: {
    default: '#fafafa',
    paper: '#ffffff',
  },
  divider: '#e8e8e8',
};

const theme = createTheme({
  palette,
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif",
    h1: { fontWeight: 600, letterSpacing: '-0.03em' },
    h2: { fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.02em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 500 },
    caption: { color: '#71717a' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#fafafa',
          color: '#1a1a1a',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '*::-webkit-scrollbar': { width: 6, height: 6 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': { background: '#d4d4d8', borderRadius: 999 },
        '*::-webkit-scrollbar-thumb:hover': { background: '#a1a1aa' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e8e8e8',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          borderRadius: 12,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          paddingBottom: 0,
        },
        title: {
          fontSize: '0.95rem',
          fontWeight: 600,
          color: '#1a1a1a',
        },
        subheader: {
          fontSize: '0.8rem',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '1.25rem',
          '&:last-child': { paddingBottom: '1.25rem' },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
        },
        colorPrimary: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        outlined: {
          borderColor: '#d8d8dc',
          color: '#3f3f46',
          '&:hover': {
            borderColor: '#c4c4c8',
            backgroundColor: '#fafafa',
          },
        },
        text: {
          color: '#1c1c1c',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#71717a',
          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.06)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        outlined: {
          borderColor: '#d8d8dc',
          backgroundColor: '#fafafa',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #f0f0f2',
          padding: '0.75rem 1rem',
          fontSize: '0.85rem',
        },
        head: {
          fontWeight: 600,
          color: '#71717a',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          backgroundColor: '#fafafa',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#fafafa' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            '& fieldset': { borderColor: '#d8d8dc' },
            '&:hover fieldset': { borderColor: '#a1a1aa' },
            '&.Mui-focused fieldset': { borderColor: '#1c1c1c' },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
          backgroundColor: '#f0f0f2',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1a1a1a',
          fontSize: '0.75rem',
          borderRadius: 6,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e8e8e8',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
            color: '#1c1c1c',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.12)' },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: 'inherit',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          color: '#1a1a1a',
          boxShadow: 'none',
          borderBottom: '1px solid #e8e8e8',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#f0f0f2',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#1c1c1c',
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#1c1c1c',
          },
        },
      },
    },
  },
});

export default theme;