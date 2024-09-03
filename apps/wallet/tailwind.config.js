import daisyui from 'daisyui'

const hibitDarkTheme = {
  'primary': '#0099E5',
  'secondary': '#14C394',
  'accent': '#2d3137',  // for border
  'neutral': '#848e9c',
  'base-100': 'rgba(27, 29, 34, 1)',
  'base-200': 'rgba(31, 35, 40, 1)',
  "base-300": 'rgb(45, 49, 55)',
  // "info": "#00b1d1",
  success: '#14C394',
  "warning": "#FFC349",
  error: '#F53D54',

  '--bc': '100% 0 0',
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '576px',
    },
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      { 'hibit-dark': hibitDarkTheme },
      { 'hibit-dark': hibitDarkTheme },
    ],
  },
}
