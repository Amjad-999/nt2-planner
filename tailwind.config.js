/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['attribute', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Cairo', 'Readex Pro', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Cormorant Garamond"', 'serif'],
        sans: ['Cairo', 'Readex Pro', 'sans-serif'],
      },
      colors: {
        accent: 'var(--orange)',
        'accent-dark': 'var(--orange-d)',
        'accent-light': 'var(--orange-l)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        surface3: 'var(--surface3)',
        'app-bg': 'var(--bg)',
        'app-text': 'var(--text)',
        'app-text2': 'var(--text2)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        border2: 'var(--border2)',
      },
      borderRadius: {
        card: 'var(--r)',
        'card-sm': 'var(--r-sm)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
        'elev-3': 'var(--elev-3)',
      },
    },
  },
  plugins: [],
}
