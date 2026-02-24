/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          50: '#e6f9ff',
          100: '#b3ecff',
          200: '#80dfff',
          300: '#4dd2ff',
          400: '#1ac5ff',
          500: '#00b8ff',
          600: '#0093cc',
          700: '#006e99',
          800: '#004a66',
          900: '#002533',
        },
        vault: {
          bg: '#0a0e1a',
          card: '#111827',
          border: '#1e293b',
          accent: '#00ff88',
          danger: '#ff3366',
          warning: '#ffaa00',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 136, 0.2), 0 0 20px rgba(0, 255, 136, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.4), 0 0 60px rgba(0, 255, 136, 0.2)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [],
};
