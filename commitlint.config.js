module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
  ignores: [
    (message) => message === 'Updating coverage badges',
    (message) => /\(\[#\d+\]\(https:\/\/github.com/.test(message),
  ],
};
