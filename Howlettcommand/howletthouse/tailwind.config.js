/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hh: {
          green:      '#1D9E75',
          'green-dk': '#085041',
          'green-md': '#0F6E56',
          'green-lt': '#E1F5EE',
          'green-mid': '#9FE1CB',
          amber:      '#EF9F27',
          'amber-lt': '#FAEEDA',
          'amber-dk': '#633806',
          blue:       '#378ADD',
          'blue-lt':  '#E6F1FB',
          'blue-dk':  '#185FA5',
          pink:       '#D4537E',
          'pink-lt':  '#FBEAF0',
          'pink-dk':  '#723850',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
