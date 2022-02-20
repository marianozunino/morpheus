module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    "body-max-line-length": [0, "always"],
  },
  ignores: [
    (message) => message === "Updating coverage badges"
  ]
}
