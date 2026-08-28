module.exports = {
  root: true,
  extends: ['next', 'next/core-web-vitals', 'prettier'],
  plugins: ['testing-library'],
  rules: {
    'testing-library/no-node-access': 'off',
  },
};
