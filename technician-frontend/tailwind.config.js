/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--nb-action)',
        "primary-hover": 'var(--nb-action-pressed)',
        "primary-light": 'var(--nb-page)',
        secondary: 'var(--nb-ink)',
        success: 'var(--nb-ink)',
        warning: 'var(--nb-ink)',
        danger: 'var(--nb-action)',
        info: 'var(--nb-link)',
        page: 'var(--nb-page)',
        card: 'var(--nb-surface)',
        border: 'var(--nb-line)',
        divider: 'var(--nb-line)',
        text: {
          primary: 'var(--nb-ink)',
          secondary: 'var(--nb-secondary)',
          tertiary: 'var(--nb-muted)',
          disabled: 'var(--nb-control)',
        },
      },
      fontFamily: {
        sans: [
          "PingFang SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["28px", "36px"],
        "title-lg": ["22px", "28px"],
        "title-md": ["18px", "28px"],
        "title-sm": ["16px", "24px"],
        body: ["14px", "22px"],
        "body-sm": ["13px", "20px"],
        caption: ["12px", "18px"],
      },
      borderRadius: {
        card: "20px",
        button: "16px",
        input: "14px",
        small: "8px",
        pill: "999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        'safe': 'env(safe-area-inset-bottom, 0px)',
      },
      boxShadow: {
        card: "0 4px 16px rgba(0,0,0,0.04)",
        popup: "0 8px 24px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
}
