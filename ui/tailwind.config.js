/* eslint-env node */
module.exports = {
  purge: {
    enabled: true,
    content: ['./views/**/*.jsx'],
    safelist: [
      'pt-12',
      'p-10',
      'p-5',
      'px-8',
      'rounded-xl',
      'w-28',
      'h-28',
      'text-base',
    ],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
