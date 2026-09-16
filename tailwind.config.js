/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // small brand scale so md: breakpoint dashboards stay consistent
        brand: {
          DEFAULT: '#0ea5e9',
          fg: '#0369a1',
        },
      },
    },
  },
  plugins: [],
};
