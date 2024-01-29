---
"@morpheus4j/cli": major
"@morpheus4j/nestjs": major
"@morpheus4j/core": major
"@morpheus4j/eslint-config-custom": major
"@morpheus4j/tsconfig": major
---

### Changes
  - Moving morpheus4j to a monorepo architecture
  - Created a `core` module that hold the shared morpheus4j code
  - Created a `cli` module that holds the cli application
  - Created a `nestjs` module that holds the nestjs module
#### TODOs:
  - Migrate tests from the old `morpheus4j` package
  - Use vitest instead of jest
#### WIP:
  - Update `README.md`
