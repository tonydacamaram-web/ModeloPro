/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gp: {
          base:        '#080808',
          card:        '#111111',
          card2:       '#161616',
          hover:       '#1e1e1e',
          border:      '#252525',
          border2:     '#353535',
          fucsia:      '#e91e8c',
          'fucsia-h':  '#c7176e',
          'fucsia-dim':'#1f0616',
          'fucsia-t':  '#f06ab0',
          dorado:      '#d4a017',
          'dorado-h':  '#b58900',
          'dorado-dim':'#1e1500',
          'dorado-t':  '#f0c040',
          text:        '#f0f0f0',
          text2:       '#b0b0b0',
          text3:       '#6a6a6a',
          ok:          '#22c55e',
          error:       '#ef4444',
          warn:        '#f59e0b',
          info:        '#38bdf8',
        },
      },
    },
  },
  plugins: [],
};
