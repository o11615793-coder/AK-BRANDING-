/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F1D67A',
          dark: '#9C7A22',
        },
        charcoal: '#0A0A0A',
        onyx: '#121212',
        silver: '#C7C9CC',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #F1D67A 0%, #D4AF37 45%, #9C7A22 100%)',
        'hero-radial': 'radial-gradient(ellipse at top, rgba(212,175,55,0.15), transparent 60%)',
      },
      boxShadow: {
        gold: '0 0 25px rgba(212,175,55,0.25)',
      },
    },
  },
  plugins: [],
}
