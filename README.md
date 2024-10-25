# Morpheus

[![build-deploy](https://github.com/marianozunino/morpheus/actions/workflows/build_deploy.yml/badge.svg)](https://github.com/marianozunino/morpheus/actions/workflows/build_deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Coverage Status](https://coveralls.io/repos/github/marianozunino/morpheus/badge.svg)](https://coveralls.io/github/marianozunino/morpheus)
![npm type definitions](https://img.shields.io/npm/types/morpheus4j)
[![Downloads/week](https://img.shields.io/npm/dw/morpheus4j.svg)](https://npmjs.org/package/morpheus4j)
[![Version](https://img.shields.io/npm/v/morpheus4j.svg)](https://npmjs.org/package/morpheus4j)
<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="25" alt="Nest Logo" /></a>


### About
Morpheus is a database migration tool for Neo4j written in Typescript.

> Morpheus is a modern, open-source, database migration tool for [Neo4j](http://neo4j.com).
> It is designed to be a simple, intuitive tool for database migrations.
> It is inspired by [Michael Simons tool for Java](https://github.com/michael-simons/neo4j-migrations).

This project has been tested with

> - Neo4j 4.4.4
> - Neo4j 5.x


<!-- toc -->
* [Morpheus](#morpheus)
* [Usage](#usage)
* [Commands](#commands)
* [NestJs Integration <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="25" alt="Nest Logo" /></a>](#nestjs-integration-a-hrefhttpnestjscom-targetblankimg-srchttpsnestjscomimglogo-smallsvg-width25-altnest-logo-a)
* [How it works](#how-it-works)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g morpheus4j
$ morpheus COMMAND
running command...
$ morpheus (--version)
morpheus4j/4.0.0 linux-x64 node-v20.13.1
$ morpheus --help [COMMAND]
USAGE
  $ morpheus COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`morpheus autocomplete [SHELL]`](#morpheus-autocomplete-shell)
* [`morpheus clean`](#morpheus-clean)
* [`morpheus create NAME`](#morpheus-create-name)
* [`morpheus info`](#morpheus-info)
* [`morpheus init`](#morpheus-init)
* [`morpheus migrate`](#morpheus-migrate)

## `morpheus autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ morpheus autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ morpheus autocomplete

  $ morpheus autocomplete bash

  $ morpheus autocomplete zsh

  $ morpheus autocomplete powershell

  $ morpheus autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.6/src/commands/autocomplete/index.ts)_

## `morpheus clean`

Clean up migration-related database objects

```
USAGE
  $ morpheus clean [--json] [--drop-constraints] [-c <value>] [-m <value>] [-h <value>] [-p <value>] [-s
    <value>] [-P <value>] [-u <value>] [-d <value>]

FLAGS
  -P, --password=<value>        Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>      Path to the morpheus file. ./morpheus.json by default
  -d, --database=<value>        Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>            Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>  Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -p, --port=<value>            Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>          Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>        Neo4j username. Env: 'MORPHEUS_USERNAME'
      --drop-constraints        Additionally remove all Morpheus-related database constraints

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Clean up migration-related database objects

  Removes all Morpheus migration metadata including nodes, relationships, and optionally constraints.
  Use with caution as this will reset the migration history.

EXAMPLES
  $ morpheus clean

  $ morpheus clean --drop-constraints

  $ morpheus clean --config ./custom-config.json
```

_See code: [src/commands/clean.ts](https://github.com/marianozunino/morpheus/blob/v4.0.0/src/commands/clean.ts)_

## `morpheus create NAME`

Generate a new timestamped migration file with boilerplate code

```
USAGE
  $ morpheus create NAME [-c <value>] [-m <value>]

ARGUMENTS
  NAME  Name of the migration (will be prefixed with a semver number)

FLAGS
  -c, --configFile=<value>      Path to the morpheus file. ./morpheus.json by default
  -m, --migrationsPath=<value>  Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'

DESCRIPTION
  Generate a new timestamped migration file with boilerplate code

EXAMPLES
  $ morpheus create add-user-nodes

  $ morpheus create update-relationships -m ~/path/to/migrations

  $ morpheus create update-relationships --config ./custom-config.json
```

_See code: [src/commands/create.ts](https://github.com/marianozunino/morpheus/blob/v4.0.0/src/commands/create.ts)_

## `morpheus info`

Info up migration-related database objects

```
USAGE
  $ morpheus info [--json] [-c <value>] [-m <value>] [-h <value>] [-p <value>] [-s <value>] [-P <value>]
    [-u <value>] [-d <value>]

FLAGS
  -P, --password=<value>        Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>      Path to the morpheus file. ./morpheus.json by default
  -d, --database=<value>        Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>            Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>  Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -p, --port=<value>            Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>          Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>        Neo4j username. Env: 'MORPHEUS_USERNAME'

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Info up migration-related database objects

  Removes all Morpheus migration metadata including nodes, relationships, and optionally constraints.
  Use with caution as this will reset the migration history.

EXAMPLES
  $ morpheus info

  $ morpheus info --config ./custom-config.json
```

_See code: [src/commands/info.ts](https://github.com/marianozunino/morpheus/blob/v4.0.0/src/commands/info.ts)_

## `morpheus init`

Initialize a new Morpheus configuration file with database connection settings

```
USAGE
  $ morpheus init [-c <value>] [-f]

FLAGS
  -c, --configFile=<value>  Path to the morpheus file. ./morpheus.json by default
  -f, --force               Overwrite existing configuration file if it exists

DESCRIPTION
  Initialize a new Morpheus configuration file with database connection settings

EXAMPLES
  $ morpheus init

  $ morpheus init --force

  $ morpheus init --config ./custom-path/morpheus.json

  $ morpheus init --config .config.json --force
```

_See code: [src/commands/init.ts](https://github.com/marianozunino/morpheus/blob/v4.0.0/src/commands/init.ts)_

## `morpheus migrate`

Execute pending database migrations in sequential order

```
USAGE
  $ morpheus migrate [--json] [-c <value>] [-m <value>] [-h <value>] [-p <value>] [-s <value>] [-P <value>]
    [-u <value>] [-d <value>]

FLAGS
  -P, --password=<value>        Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>      Path to the morpheus file. ./morpheus.json by default
  -d, --database=<value>        Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>            Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>  Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -p, --port=<value>            Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>          Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>        Neo4j username. Env: 'MORPHEUS_USERNAME'

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Execute pending database migrations in sequential order

EXAMPLES
  $ morpheus migrate

  $ morpheus migrate -m ~/path/to/migrations

  $ morpheus migrate --config ./custom-config.json
```

_See code: [src/commands/migrate.ts](https://github.com/marianozunino/morpheus/blob/v4.0.0/src/commands/migrate.ts)_
<!-- commandsstop -->


# NestJs Integration <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="25" alt="Nest Logo" /></a>

### Module Usage

```ts
import { MorpheusModule, MorpheusService,  Neo4jConfig, Neo4jScheme  } from '../../dist/nestjs';
import { Module, Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [MorpheusModule, ConfigModule.forRoot()],
  providers: [MigrationsService],
})
export class MigrationsModule {}

@Injectable()
export class MigrationsService {
  constructor(
    private readonly morpheusService: MorpheusService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    // When no config is provided, the default config is used
    // -> morpheus.json
    // -> moprheus environment variables

    await this.morpheusService.cleanDatabase(); // NOTE: You probably don't want to do this, specially in production
    await this.morpheusService.runMigrations();

    // Use the ConfigService to access the environment variables
    const configs: Neo4jConfig[] = [
      {
        scheme: Neo4jScheme.BOLT,
        host: 'localhost',
        port: 7687,
        username: 'neo4j',
        password: 'password',
        migrationsPath: '../neo4j/migrations',
      },
    ];

    for (const config of configs) {
      // Clean and run migrations
      await this.morpheusService.cleanDatabase(config); // NOTE: You probably don't want to do this, specially in production
      await this.morpheusService.runMigrations(config);
    }
  }
}
```

# How it works

The approach is simple. Morpheus will read all migrations in the `neo4j/migrations` directory and execute them in order.

For each migration, Morpheus will create a transaction and execute the migration. Thus a migration may contain multiple Cypher statements (**each statement must end with `;`**).

Once a migration file is executed, Morpheus will keep track of the migration and will not execute em again.

Existing migration files that have already been executed **can not** be modified since they are stored in a database with their corresponding checksum (crc32).

If you want to revert a migration, create a new migration and revert the changes.

## How does neo4j keep track of the migrations?

You can take a look at schema and explanation on [Michael's README](https://michael-simons.github.io/neo4j-migrations/2.2.0/#concepts_chain) there's a neat graph that shows the migration chain.
