/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['attribute', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Tajawal', 'sans-serif'],
        latin: ['Inter', 'sans-serif'],
        display: ['Tajawal', 'sans-serif'],
        sans: ['Tajawal', 'sans-serif'],
      },
      colors: {
        accent: 'var(--orange)',
        'accent-dark': 'var(--orange-d)',
        'accent-light': 'var(--orange-l)',
        'accent-ink': 'var(--orange-ink)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        surface3: 'var(--surface3)',
        'app-bg': 'var(--bg)',
        'app-text': 'var(--text)',
        'app-text2': 'var(--text2)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        border2: 'var(--border2)',
        success: 'var(--green)',
        error: 'var(--red)',
        info: 'var(--blue)',
      },
      /* Tailwind's own radius scale is repointed at the token ladder so the
         app has ONE set of corners, not two parallel ones. Without this,
         `rounded-lg` (8px) and `borderRadius: 'var(--r-xs)'` (8px) happen to
         agree today and drift apart the moment a token moves. */
      borderRadius: {
        DEFAULT: 'var(--r-2xs)',
        sm: 'var(--r-2xs)',
        md: 'var(--r-xs)',
        lg: 'var(--r-xs)',
        xl: 'var(--r-sm)',
        '2xl': 'var(--r)',
        '3xl': 'var(--r-lg)',
        full: 'var(--r-pill)',
        card: 'var(--r)',
        'card-sm': 'var(--r-sm)',
      },
      /* One elevation ladder. There used to be two: --shadow-sm/--shadow/
         --shadow-lg (1 use in the whole app) and --elev-1/2/3 (80 uses).
         The utilities now resolve to the ladder that is actually used. */
      boxShadow: {
        sm: 'var(--elev-1)',
        DEFAULT: 'var(--elev-2)',
        lg: 'var(--elev-3)',
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
        'elev-3': 'var(--elev-3)',
      },
    },
  },
  plugins: [],
}
