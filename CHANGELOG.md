## [4.5.1](https://github.com/marianozunino/morpheus/compare/v4.5.0...v4.5.1) (2025-05-14)


### Bug Fixes

* use environment variable for backwards compatibility in checksum function ([d99a4ea](https://github.com/marianozunino/morpheus/commit/d99a4ead2a8d51f9d6ca19607eb554581df2ab9f)), closes [#48](https://github.com/marianozunino/morpheus/issues/48)

# [4.5.0](https://github.com/marianozunino/morpheus/compare/v4.4.0...v4.5.0) (2025-03-24)


### Features

* migration validation command ([daffca2](https://github.com/marianozunino/morpheus/commit/daffca2c6faaf2cab3afb4ecfb08f9cb6f4b6a3d))

# [4.4.0](https://github.com/marianozunino/morpheus/compare/v4.3.0...v4.4.0) (2025-03-21)


### Features

* add 'delete' command to remove migrations from database ([b675a63](https://github.com/marianozunino/morpheus/commit/b675a6324aafeb6ba3e79658f94ccd2bf97fb5b1))

# [4.3.0](https://github.com/marianozunino/morpheus/compare/v4.2.0...v4.3.0) (2025-03-16)


### Features

* upgrade to nestjs@11 ([672fe15](https://github.com/marianozunino/morpheus/commit/672fe1555ef739daa1619a3856ecfc33b1a7a0ca))

# [4.2.0](https://github.com/marianozunino/morpheus/compare/v4.1.0...v4.2.0) (2024-10-31)


### Features

* **migrate:** add transaction-mode flag for improved migration control ([07ee812](https://github.com/marianozunino/morpheus/commit/07ee812f4944ba9439b8e4fbe028b5b2585f7b63))

# [4.1.0](https://github.com/marianozunino/morpheus/compare/v4.0.0...v4.1.0) (2024-10-28)


### Features

* Add --debug and --dry-run flags for enhanced migration control ([7785af7](https://github.com/marianozunino/morpheus/commit/7785af71d9b87d6eff439ba5ab9b04f1d80c750a))

# [4.0.0](https://github.com/marianozunino/morpheus/compare/v3.5.1...v4.0.0) (2024-10-25)


* feat!: migrate from NestJS+Commander to OCLIF ([4aa2350](https://github.com/marianozunino/morpheus/commit/4aa2350e5ac50e34e96a52d12bcc148bc69fb0c8))


### BREAKING CHANGES

* Major architectural changes in how the library is used.

- Removed NestJS module `register` and `registerAsync` methods
- Removed `runMigrationsFor` method
- Simplified CLI architecture by switching to OCLIF
- CLI flags can now be overridden by env vars (MORPHEUS_*)

Migration Guide:
1. NestJS Integration:
   - Instead of using the module, inject MorpheusService directly
   - Available methods:
     * cleanDatabase(config?: {cleanConfig?: {dropConstraints?: boolean}} & Neo4jConfig)
     * runMigrations(config?: Neo4jConfig)

2. Configuration:
   - Config must now be explicitly provided to methods
   - Falls back to:
     1. MORPHEUS_* environment variables
     2. morpheus.json file

## [3.5.1](https://github.com/marianozunino/morpheus/compare/v3.5.0...v3.5.1) (2023-12-18)


### Bug Fixes

* connection types ([dc1d4fb](https://github.com/marianozunino/morpheus/commit/dc1d4fb6177edcba8715decd2092acd2cf0cab39))

# [3.5.0](https://github.com/marianozunino/morpheus/compare/v3.4.0...v3.5.0) (2023-12-08)


### Features

* **#36:** support nestjs 10 ([f0ea6ba](https://github.com/marianozunino/morpheus/commit/f0ea6bac21c814284b621bee1d8ebc37651d48f5)), closes [#36](https://github.com/marianozunino/morpheus/issues/36)

# [3.4.0](https://github.com/marianozunino/morpheus/compare/v3.3.0...v3.4.0) (2023-10-16)


### Features

* allow setting database config property from env var ([9a6e9ca](https://github.com/marianozunino/morpheus/commit/9a6e9ca3c036afb28e2eb55c8ba798a89776b083))

# [3.3.0](https://github.com/marianozunino/morpheus/compare/v3.2.0...v3.3.0) (2023-09-28)


### Features

* allow setting session database from config ([35a1443](https://github.com/marianozunino/morpheus/commit/35a14438b10c7af23f72ba4c79d925c61d43bddd))

# [3.2.0](https://github.com/marianozunino/morpheus/compare/v3.1.0...v3.2.0) (2023-06-19)


### Features

* add clean command ([0a8fc6f](https://github.com/marianozunino/morpheus/commit/0a8fc6f7d8ded5477f11f7b70ca14b826d4b7dbd))

# [3.1.0](https://github.com/marianozunino/morpheus/compare/v3.0.2...v3.1.0) (2023-06-19)


### Features

* expose MorpheusService [#30](https://github.com/marianozunino/morpheus/issues/30) ([469e232](https://github.com/marianozunino/morpheus/commit/469e232db001933818cbb72a9069fd6ba9f17804))

## [3.0.2](https://github.com/marianozunino/morpheus/compare/v3.0.1...v3.0.2) (2023-03-10)


### Bug Fixes

* compare migrations according to semver ([61a7fbd](https://github.com/marianozunino/morpheus/commit/61a7fbd1e2c6c96f98334b027a0256bb6dfdecab))

## [3.0.1](https://github.com/marianozunino/morpheus/compare/v3.0.0...v3.0.1) (2023-03-09)


### Bug Fixes

* compare migrations according to semver ([cba10b6](https://github.com/marianozunino/morpheus/commit/cba10b6346668fb6c46d3ba4b5f555137ceef127))

# [3.0.0](https://github.com/marianozunino/morpheus/compare/v2.4.1...v3.0.0) (2023-02-03)


### Features

* migrate to nestjs 9 ([f09004b](https://github.com/marianozunino/morpheus/commit/f09004bbd96ba05c308b3c36e38f14e771bdc82c))


### BREAKING CHANGES

* nestjs@9 is now required

## [2.4.1](https://github.com/marianozunino/morpheus/compare/v2.4.0...v2.4.1) (2023-01-31)


### Bug Fixes

* return status code 1 if migration process fails ([866b0b3](https://github.com/marianozunino/morpheus/commit/866b0b3407222d499f57e6b8a0cce2f5f8c7c602))

# [2.4.0](https://github.com/marianozunino/morpheus/compare/v2.3.3...v2.4.0) (2022-12-13)


### Features

* support neo4j version 5 ([9fa4413](https://github.com/marianozunino/morpheus/commit/9fa44132eb1584ad40ed1bf423697d136a8b6033))

## [2.3.3](https://github.com/marianozunino/morpheus/compare/v2.3.2...v2.3.3) (2022-12-12)


### Bug Fixes

* auto create migration folder when using nestjs ([cf4c8db](https://github.com/marianozunino/morpheus/commit/cf4c8db84282a670fcd135dfedfdb1c8e648c3a0))

## [2.3.2](https://github.com/marianozunino/morpheus/compare/v2.3.1...v2.3.2) (2022-03-10)


### Bug Fixes

* remove internal exports ([d98d00b](https://github.com/marianozunino/morpheus/commit/d98d00b6b02f93328b5ce8787a46146139fa7488))

## [2.3.1](https://github.com/marianozunino/morpheus/compare/v2.3.0...v2.3.1) (2022-03-02)


### Bug Fixes

* **minor:** make neo4j-driver-core a dev dependency ([e0a0e9c](https://github.com/marianozunino/morpheus/commit/e0a0e9c47b1f55dfd43084b87d57c31962f41e7b))

# [2.3.0](https://github.com/marianozunino/morpheus/compare/v2.2.5...v2.3.0) (2022-03-02)


### Bug Fixes

* **minor:** update some messages ([4e79ee2](https://github.com/marianozunino/morpheus/commit/4e79ee279dfe257c729813cecdef9a97960a12f6))


### Features

* add configurable migrations path option ([48d814a](https://github.com/marianozunino/morpheus/commit/48d814ab5989cbbcbb581b83a5b7259fdf7a607d))

## [2.2.5](https://github.com/marianozunino/morpheus/compare/v2.2.4...v2.2.5) (2022-03-02)


### Bug Fixes

* **deploy:** unique label for github release ([d72d340](https://github.com/marianozunino/morpheus/commit/d72d34021292cc19b695e570c29a96f090e208c4))

## [2.2.4](https://github.com/marianozunino/morpheus/compare/v2.2.3...v2.2.4) (2022-03-02)


### Bug Fixes

* **deploy:** unique label for github release ([f74c56c](https://github.com/marianozunino/morpheus/commit/f74c56c20ad29c360b4e5a599b76818a1a3f74ca))

## [2.2.3](https://github.com/marianozunino/morpheus/compare/v2.2.2...v2.2.3) (2022-03-02)


### Bug Fixes

* **deploy:** unique label for github release ([6348c1f](https://github.com/marianozunino/morpheus/commit/6348c1fea935f52b49114532673f29eaf490eaf1))

## [2.2.2](https://github.com/marianozunino/morpheus/compare/v2.2.1...v2.2.2) (2022-03-02)


### Bug Fixes

* **minor:** rename MigrationService to MorpheusService ([e76300c](https://github.com/marianozunino/morpheus/commit/e76300c62257b1cf71f43ee01e2da4f129707336))
