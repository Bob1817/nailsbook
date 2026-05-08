/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF5A66",
        "primary-hover": "#FF4757",
        "primary-light": "#FFE8EA",
        secondary: "#FF9F43",
        success: "#36C275",
        warning: "#FF9F43",
        danger: "#FF5A66",
        info: "#5B8CFF",
        page: "#FFF9F8",
        card: "#FFFFFF",
        border: "#F0E7E7",
        divider: "#F5F5F5",
        text: {
          primary: "#1F1F1F",
          secondary: "#666666",
          tertiary: "#999999",
          disabled: "#CCCCCC",
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
