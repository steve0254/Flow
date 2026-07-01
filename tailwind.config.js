/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:    { 1: '#0b0b0c', 2: '#131314', 3: '#1b1b1d', 4: '#222224', 5: '#2a2a2d' },
        ink:   { 1: '#f2efea', 2: '#a39e96', 3: '#5c5650', 4: '#322e29' },
        accent: { DEFAULT: '#c8f59a', dim: 'rgba(200,245,154,0.12)', faint: 'rgba(200,245,154,0.05)' },
        red:   { DEFAULT: '#e8654a', dim: 'rgba(232,101,74,0.13)' },
        blue:  { DEFAULT: '#6b9bf7', dim: 'rgba(107,155,247,0.13)' },
        gold:  { DEFAULT: '#ecc873', dim: 'rgba(236,200,115,0.13)' },
        purple:{ DEFAULT: '#a594f7', dim: 'rgba(165,148,247,0.13)' },
      },
      fontFamily: {
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        mono:  ['"DM Mono"', '"Fira Code"', 'monospace'],
      },
      borderColor: { DEFAULT: 'rgba(242,239,234,0.06)' },
      keyframes: {
        pulse: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        slideIn: { from: { transform: 'translateX(20px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        alarmPulse: {
          '0%,100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232,101,74,0.4)' },
          '50%':     { transform: 'scale(1.04)', boxShadow: '0 0 0 16px rgba(232,101,74,0)' }
        }
      },
      animation: {
        pulse: 'pulse 1.4s ease-in-out infinite',
        fadeIn: 'fadeIn 0.15s ease-out',
        slideIn: 'slideIn 0.22s cubic-bezier(.25,.8,.25,1)',
        alarmPulse: 'alarmPulse 1s ease-in-out infinite',
      }
    }
  },
  plugins: []
}
