import daisyui from 'daisyui'

const hibitDarkTheme = {
  'primary': '#0099E5',
  'secondary': '#14C394',
  'accent': '#262D40',  // for border
  'neutral': '#5F7195',
  'base-100': '#20263C',
  'base-200': '#273049',
  "base-300": '#354159',
  // "info": "#00b1d1",
  success: '#14C394',
  // "warning": "#ffb600",
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
