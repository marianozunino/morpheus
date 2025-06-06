# Morpheus

[![build-deploy](https://github.com/marianozunino/morpheus/actions/workflows/build_deploy.yml/badge.svg)](https://github.com/marianozunino/morpheus/actions/workflows/build_deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
<a href='https://coveralls.io/github/marianozunino/morpheus?branch=master'>
  <img src='https://coveralls.io/repos/github/marianozunino/morpheus/badge.svg?branch=master&kill_cache=1' alt='Coverage Status'>
</a>
![npm type definitions](https://img.shields.io/npm/types/morpheus4j)
[![Downloads/week](https://img.shields.io/npm/dw/morpheus4j.svg)](https://npmjs.org/package/morpheus4j)
[![Version](https://img.shields.io/npm/v/morpheus4j.svg)](https://npmjs.org/package/morpheus4j)
<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="25" alt="Nest Logo" /></a>

### About
Morpheus is a modern, open-source database migration tool for [Neo4j](http://neo4j.com). It is designed to be a simple, intuitive tool for managing database migrations. The project is inspired by [Michael Simons' tool for Java](https://github.com/michael-simons/neo4j-migrations).

### Quick Start
```bash
npm install -g morpheus4j
morpheus init         # Create config file
morpheus create user-nodes  # Creates V1_0_0__user-nodes.cypher
morpheus migrate     # Run migrations
```

### Prerequisites
- Node.js
- Neo4j database (4.4.4 or 5.x)
- npm or yarn package manager

### Migration Files
Migration files:
- Use `.cypher` extension
- Are versioned using semver (e.g., `V1_0_0__create_users.cypher`)
- Contain pure Cypher queries
- Each statement must end with a semicolon

Example migration file `V1_0_0__create_users.cypher`:
```cypher
CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;

CREATE (u:User {
  email: 'admin@example.com',
  name: 'Admin User',
  created_at: datetime()
});
```

### File Naming Convention
Migration files follow this pattern:
- Prefix: `V` (for version)
- Version: Semver numbers separated by underscores (e.g., `1_0_0`)
- Separator: Double underscore `__`
- Description: Descriptive name using hyphens
- Extension: `.cypher`

Example: `V1_0_0__create-user-constraints.cypher`

### Environment Variables
Morpheus supports the following environment variables:
- `MORPHEUS_HOST` - Neo4j host
- `MORPHEUS_PORT` - Neo4j port
- `MORPHEUS_SCHEME` - Neo4j scheme
- `MORPHEUS_USERNAME` - Neo4j username
- `MORPHEUS_PASSWORD` - Neo4j password
- `MORPHEUS_DATABASE` - Neo4j database name
- `MORPHEUS_MIGRATIONS_PATH` - Path to migrations directory

### Best Practices
- Keep migrations small and focused
- Use descriptive names for migration files
- Test migrations in a development environment first
- Back up your database before running migrations in production
- Don't modify existing migrations - create new ones to make changes

### Troubleshooting
- **Checksum Mismatch**: Occurs when trying to modify an existing migration. Create a new migration instead.
- **Connection Issues**: Verify your Neo4j credentials and connection settings in morpheus.json
- **Missing Semicolons**: Ensure all Cypher statements end with semicolons

<!-- The following sections are auto-generated by oclif -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g morpheus4j
$ morpheus COMMAND
running command...
$ morpheus (--version)
morpheus4j/4.5.1 linux-x64 node-v20.19.0
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
* [`morpheus delete VERSION`](#morpheus-delete-version)
* [`morpheus info`](#morpheus-info)
* [`morpheus init`](#morpheus-init)
* [`morpheus migrate`](#morpheus-migrate)
* [`morpheus validate`](#morpheus-validate)

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
  $ morpheus clean [--json] [--debug] [--drop-constraints] [-c <value>] [-m <value>] [-h <value>] [-p
    <value>] [-s <value>] [-P <value>] [-u <value>] [-d <value>]

FLAGS
  -P, --password=<value>        Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>      [default: /home/runner/work/morpheus/morpheus/morpheus.json] Path to the morpheus file
                                (CWD/morpheus.json by default)
  -d, --database=<value>        Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>            Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>  [default: neo4j/migrations] Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -p, --port=<value>            Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>          Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>        Neo4j username. Env: 'MORPHEUS_USERNAME'
      --drop-constraints        Additionally remove all Morpheus-related database constraints

GLOBAL FLAGS
  --debug  Enable debug logging
  --json   Format output as json.

DESCRIPTION
  Clean up migration-related database objects

  Removes all Morpheus migration metadata including nodes, relationships, and optionally constraints.
  Use with caution as this will reset the migration history.

EXAMPLES
  $ morpheus clean

  $ morpheus clean --drop-constraints

  $ morpheus clean --config ./custom-config.json
```

_See code: [src/commands/clean.ts](https://github.com/marianozunino/morpheus/blob/v4.5.1/src/commands/clean.ts)_

## `morpheus create NAME`

Generate a new timestamped migration file with boilerplate code

```
USAGE
  $ morpheus create NAME [--json] [-c <value>] [-m <value>]

ARGUMENTS
  NAME  Name of the migration (will be prefixed with a semver number)

FLAGS
  -c, --configFile=<value>      [default: /home/runner/work/morpheus/morpheus/morpheus.json] Path to the morpheus file
                                (CWD/morpheus.json by default)
  -m, --migrationsPath=<value>  [default: neo4j/migrations] Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Generate a new timestamped migration file with boilerplate code

EXAMPLES
  $ morpheus create add-user-nodes

  $ morpheus create update-relationships -m ~/path/to/migrations

  $ morpheus create update-relationships --config ./custom-config.json
```

_See code: [src/commands/create.ts](https://github.com/marianozunino/morpheus/blob/v4.5.1/src/commands/create.ts)_

## `morpheus delete VERSION`

Delete a migration from the database.

```
USAGE
  $ morpheus delete VERSION [--json] [--debug] [-c <value>] [-m <value>] [-h <value>] [-p <value>] [-s
    <value>] [-P <value>] [-u <value>] [-d <value>] [--dry-run]

ARGUMENTS
  VERSION  The version that should be deleted

FLAGS
  -P, --password=<value>        Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>      [default: /home/runner/work/morpheus/morpheus/morpheus.json] Path to the morpheus file
                                (CWD/morpheus.json by default)
  -d, --database=<value>        Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>            Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>  [default: neo4j/migrations] Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -p, --port=<value>            Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>          Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>        Neo4j username. Env: 'MORPHEUS_USERNAME'
      --dry-run                 Perform a dry run - no changes will be made to the database

GLOBAL FLAGS
  --debug  Enable debug logging
  --json   Format output as json.

DESCRIPTION
  Delete a migration from the database.

  This command can be used to repair broken migration chains. If you accidentally deleted a migration file, you can use
  this command to find the previous migration and delete it.

EXAMPLES
  $ morpheus delete 1.0.0

  $ morpheus delete 1.2.3 --config ./custom-config.json

  $ morpheus delete 1.4.0 --dry-run
```

_See code: [src/commands/delete.ts](https://github.com/marianozunino/morpheus/blob/v4.5.1/src/commands/delete.ts)_

## `morpheus info`

Info up migration-related database objects

```
USAGE
  $ morpheus info [--json] [--debug] [-c <value>] [-m <value>] [-h <value>] [-p <value>] [-s <value>] [-P
    <value>] [-u <value>] [-d <value>]

FLAGS
  -P, --password=<value>        Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>      [default: /home/runner/work/morpheus/morpheus/morpheus.json] Path to the morpheus file
                                (CWD/morpheus.json by default)
  -d, --database=<value>        Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>            Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>  [default: neo4j/migrations] Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -p, --port=<value>            Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>          Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>        Neo4j username. Env: 'MORPHEUS_USERNAME'

GLOBAL FLAGS
  --debug  Enable debug logging
  --json   Format output as json.

DESCRIPTION
  Info up migration-related database objects

  Removes all Morpheus migration metadata including nodes, relationships, and optionally constraints.
  Use with caution as this will reset the migration history.

EXAMPLES
  $ morpheus info

  $ morpheus info --config ./custom-config.json
```

_See code: [src/commands/info.ts](https://github.com/marianozunino/morpheus/blob/v4.5.1/src/commands/info.ts)_

## `morpheus init`

Initialize a new Morpheus configuration file with database connection settings

```
USAGE
  $ morpheus init [-c <value>] [-f]

FLAGS
  -c, --configFile=<value>  [default: /home/runner/work/morpheus/morpheus/morpheus.json] Path to the morpheus file
                            (CWD/morpheus.json by default)
  -f, --force               Overwrite existing configuration file if it exists

DESCRIPTION
  Initialize a new Morpheus configuration file with database connection settings

EXAMPLES
  $ morpheus init

  $ morpheus init --force

  $ morpheus init --config ./custom-path/morpheus.json

  $ morpheus init --config .config.json --force
```

_See code: [src/commands/init.ts](https://github.com/marianozunino/morpheus/blob/v4.5.1/src/commands/init.ts)_

## `morpheus migrate`

Execute pending database migrations in sequential order

```
USAGE
  $ morpheus migrate [--json] [--debug] [-c <value>] [-m <value>] [-h <value>] [-p <value>] [-s <value>] [-P
    <value>] [-u <value>] [-d <value>] [--dry-run] [--transaction-mode PER_MIGRATION|PER_STATEMENT]

FLAGS
  -P, --password=<value>           Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>         [default: /home/runner/work/morpheus/morpheus/morpheus.json] Path to the morpheus
                                   file (CWD/morpheus.json by default)
  -d, --database=<value>           Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>               Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>     [default: neo4j/migrations] Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -p, --port=<value>               Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>             Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>           Neo4j username. Env: 'MORPHEUS_USERNAME'
      --dry-run                    Perform a dry run - no changes will be made to the database
      --transaction-mode=<option>  [default: PER_MIGRATION] Transaction mode
                                   <options: PER_MIGRATION|PER_STATEMENT>

GLOBAL FLAGS
  --debug  Enable debug logging
  --json   Format output as json.

DESCRIPTION
  Execute pending database migrations in sequential order

EXAMPLES
  $ morpheus migrate

  $ morpheus migrate -m ~/path/to/migrations

  $ morpheus migrate --config ./custom-config.json

  $ morpheus migrate --dry-run

  $ morpheus migrate --transaction-mode=PER_STATEMENT
```

_See code: [src/commands/migrate.ts](https://github.com/marianozunino/morpheus/blob/v4.5.1/src/commands/migrate.ts)_

## `morpheus validate`

Validate migration state between local files and database

```
USAGE
  $ morpheus validate [--json] [--debug] [-c <value>] [-m <value>] [-h <value>] [-p <value>] [-s <value>] [-P
    <value>] [-u <value>] [-d <value>] [--fail-fast] [-o <value>] [--summary-only]

FLAGS
  -P, --password=<value>        Neo4j password. Env: 'MORPHEUS_PASSWORD'
  -c, --configFile=<value>      [default: /home/runner/work/morpheus/morpheus/morpheus.json] Path to the morpheus file
                                (CWD/morpheus.json by default)
  -d, --database=<value>        Neo4j database. Env: 'MORPHEUS_DATABASE'
  -h, --host=<value>            Neo4j host. Env: 'MORPHEUS_HOST'
  -m, --migrationsPath=<value>  [default: neo4j/migrations] Migrations path. Env: 'MORPHEUS_MIGRATIONS_PATH'
  -o, --output-file=<value>     Write detailed validation results to a JSON file
  -p, --port=<value>            Neo4j port. Env: 'MORPHEUS_PORT'
  -s, --scheme=<value>          Neo4j scheme. Env: 'MORPHEUS_SCHEME'
  -u, --username=<value>        Neo4j username. Env: 'MORPHEUS_USERNAME'
      --fail-fast               Exit with error code on first validation failure
      --summary-only            Show only the summary of validation failures

GLOBAL FLAGS
  --debug  Enable debug logging
  --json   Format output as json.

DESCRIPTION
  Validate migration state between local files and database

  Validates that all migrations in the migrations folder have been applied to the database
  in the correct order and with matching checksums. Reports discrepancies.

EXAMPLES
  $ morpheus validate

  $ morpheus validate -m ~/path/to/migrations

  $ morpheus validate --config ./custom-config.json

  $ morpheus validate --fail-fast

  $ morpheus validate --summary-only

  $ morpheus validate --output-file=validation-report.json

  $ morpheus validate --debug
```

_See code: [src/commands/validate.ts](https://github.com/marianozunino/morpheus/blob/v4.5.1/src/commands/validate.ts)_
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

Once a migration file is executed, Morpheus will keep track of the migration and will not execute it again.

Existing migration files that have already been executed **can not** be modified since they are stored in a database with their corresponding checksum (crc32).

If you want to revert a migration, create a new migration and revert the changes.

## How does neo4j keep track of the migrations?

You can take a look at schema and explanation on [Michael's README](https://michael-simons.github.io/neo4j-migrations/2.2.0/#concepts_chain) - there's a neat graph that shows the migration chain.

### Contributing
Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.
