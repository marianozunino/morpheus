[![build-deploy](https://github.com/marianozunino/morpheus/actions/workflows/build_deploy.yml/badge.svg)](https://github.com/marianozunino/morpheus/actions/workflows/build_deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Coverage Status](https://coveralls.io/repos/github/marianozunino/morpheus/badge.svg)](https://coveralls.io/github/marianozunino/morpheus)
![npm type definitions](https://img.shields.io/npm/types/morpheus4j)
[![current-version](https://img.shields.io/badge/dynamic/json?label=current-version&query=%24.version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmarianozunino%2Fmorpheus%2Fmaster%2Fpackage.json)](https://npmjs.com/package/morpheus4j)
<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="25" alt="Nest Logo" /></a>
# Morpheus


Morpheus is a database migration tool for Neo4j written in Typescript.
> Morpheus is a modern, open-source, database migration tool for [Neo4j](http://neo4j.com).
> It is designed to be a simple, intuitive tool for database migrations.
> It is inspired by [Michael Simons tool for Java](https://github.com/michael-simons/neo4j-migrations).

### _*This project has been tested with `Neo4j 4.4.4`*_

# Installation

Install the latest version of Morpheus: 

```sh
npm install morpheus4j
```

Add a script to your project's `package.json` file:

  ```json
  "scripts": {
    "morpheus": "morpheus"
  }
  ```   

# Usage

## Initial Configuration

To run migrations, first you need to configure Morpheus. To do so, create a `.morpheus.json` file in your project root directory.

> Or, you can use the `init` command:

```sh
npm run morpheus init
```

If you don't want to use a morpheus.json file, you can also use ENV variables as follows:

```env
MORPHEUS_SCHEME=neo4j
MORPHEUS_HOST=localhost
MORPHEUS_PORT=7687
MORPHEUS_USERNAME=neo4j
MORPHEUS_PASSWORD=neo4j
MORPHEUS_MIGRATIONS_PATH=neo4j/migrations # default value
```

```env
# deprecated
NEO4J_SCHEME=neo4j
NEO4J_HOST=localhost
NEO4J_PORT=7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=neo4j
```


## Create Migrations

You can create/generate migrations using the `morpheus create` command or create the files manually.

For the first, just issue the command:

```sh
npm run morpheus create <migration_name>
```

Migrations will be created under the `neo4j/migrations` directory. Each migration will be a `Cypher` file following the format `V<sem_ver>__<migration_name>.cypher`.

If you want to create/add the migration manually make sure to follow the naming convention as stated in [Michael's tool documentation](
https://michael-simons.github.io/neo4j-migrations/current/#concepts_naming-conventions).



## Run Migrations

You can run migrations by running the following command:

```sh
npm run morpheus migrate
```
This will run all migrations in the `neo4j/migrations` directory.


<h1>
  NestJs Integration
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="25" alt="Nest Logo" /></a>
</h1>


You can use Morpheus with the [NestJs](https://nestjs.com) framework. 

> Migrations will be run automatically when the application is 
[started](https://docs.nestjs.com/fundamentals/lifecycle-events#lifecycle-events-1) 
> ![logs](./assets/nest-logs.png) 

The biggest difference is that you don't need to create a `.morpheus.json` file and you can use any name for the ENV variables.

You can instantiate the module using the `forRoot` or `forRootAsync` methods.

```ts
import { Module } from '@nestjs/common';
import { MorpheusModule } from 'morpheus4j/nest';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),

    // Using forRootAsync with Dependency Injection
    MorpheusModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        scheme: configService.get("MORPHEUS_SCHEME"),
        host: configService.get("MORPHEUS_HOST"),
        port: configService.get("MORPHEUS_PORT"),
        username: configService.get("MORPHEUS_USERNAME"),
        password: configService.get("MORPHEUS_PASSWORD"),
        migrationsPath: "./neo4j/migrations", // default value
      }),
    }),


    // Using forRoot method
    MorpheusModule.forRoot({
        scheme: "neo4j",
        host: "localhost",
        port: 7687,
        username: "neo4j",
        password: "neo4j",
        migrationsPath: "./migrations",
      }),
    }),
  ],
})
export class AppModule {}
```
# How it works
The approach is simple. Morpheus will read all migrations in the `neo4j/migrations` directory and execute them in order.

For each migration, Morpheus will create a transaction and execute the migration. Thus a migration may contain multiple Cypher statements (**each statement must end with `;`**).

Once a migration file is executed, Morpheus will keep track of the migration and will not execute em again. 

Existing migration files that have already been executed **can not** be modified since they are stored in a database with their corresponding checksum (crc32).

If you want to revert a migration, create a new migration and revert the changes.

## How does neo4j keep track of the migrations?

You can take a look at schema and explanation on [Michael's README](
https://michael-simons.github.io/neo4j-migrations/current/#concepts_chain) there's a neat graph that shows the migration chain.
