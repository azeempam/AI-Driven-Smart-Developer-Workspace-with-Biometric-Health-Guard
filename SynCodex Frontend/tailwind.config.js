/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'primary': {
          bg: '#0b1020',
          text: '#eef4ff',
        },
        'secondary': {
          bg: '#10182a',
          text: '#b4bfd4',
        },
        'tertiary': {
          bg: '#18233a',
          text: '#7f8aa7',
        },
        'accent': {
          primary: '#7fe8ff',
          secondary: '#6d7cff',
          success: '#4ade80',
          warning: '#fbbf24',
          danger: '#f87171',
        },
      },
      animation: {
        glow: "glowing 1.5s infinite alternate",
        pulse: "pulse 2s infinite",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        glowing: {
          "0%": { boxShadow: "0 0 5px #7fe8ff, 0 0 10px #7fe8ff" },
          "100%": { boxShadow: "0 0 15px #7fe8ff, 0 0 30px #7fe8ff, 0 0 45px #6d7cff" },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(127, 232, 255, 0.2)',
        'glow-lg': '0 0 40px rgba(127, 232, 255, 0.3)',
      },
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};
