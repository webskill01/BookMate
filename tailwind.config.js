// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // Custom font families
      fontFamily: {
        'heading': ['Poppins', 'sans-serif'],
        'body': ['Roboto', 'sans-serif'],
        'mono': ['Roboto Mono', 'monospace'],
      },

      // Custom colors for BookMate
      colors: {
        // Accent colors
        'accent-primary': '#4CAF50',
        'accent-secondary': '#03DAC6',
        
        // Status colors
        'status-warning': '#FFB300',
        'status-danger': '#FF5252',
        'status-success': '#4CAF50',
        'status-info': '#2196F3',
        
        // Book status colors
        'status-ontime': '#4CAF50',
        'status-due-soon': '#FFB300',
        'status-overdue': '#FF5252',
        
        // Dark theme colors
        'dark': {
          'bg': '#121212',
          'card': '#1E1E1E',
          'border': '#2C2C2C',
          'text': {
            'primary': '#FFFFFF',
            'secondary': '#B3B3B3',
            'muted': '#6E6E6E',
          }
        },
        
        // Light theme colors
        'light': {
          'bg': '#FDFCF8',      // Creamy white
          'card': '#FFFFFF',     // Pure white for cards
          'border': '#E8E5E0',   // Warm light border
          'text': {
            'primary': '#1A1A1A',   // Soft black
            'secondary': '#6B6B6B', // Warm secondary
            'muted': '#9B9B9B',     // Warm muted
          }
        }
      },

      // Custom spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Custom border radius
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      // Custom shadows
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.16)',
        'glow': '0 0 20px rgba(76, 175, 80, 0.3)',
      },

      // Custom animations
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },

      // Custom keyframes
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },

      // Custom screen sizes
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
    },
  },
  plugins: [
    // Add useful plugins
    function({ addUtilities }) {
      const newUtilities = {
        // Scroll utilities
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        
        // Glass morphism utility
        '.glass': {
          'backdrop-filter': 'blur(10px)',
          'background': 'rgba(255, 255, 255, 0.1)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        
        // Safe area utilities for mobile
        '.safe-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
      }
      
      addUtilities(newUtilities)
    }
  ],
}
