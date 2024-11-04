import * as core from '@oclif/core'
import path from 'node:path'

import {DEFAULT_MIGRATIONS_PATH, EnvKeys, MORPHEUS_FILE_NAME} from './constants'

// Method 1: Sort alphabetically
const baseFlags: core.Interfaces.FlagInput = {
  configFile: core.Flags.string({
    char: 'c',
    default: path.join(process.cwd(), MORPHEUS_FILE_NAME),
    description: 'Path to the morpheus file (CWD/morpheus.json by default)',
  }),
  database: core.Flags.string({
    char: 'd',
    description: `Neo4j database. Env: '${EnvKeys.DATABASE}'`,
    env: EnvKeys.DATABASE,
  }),
  host: core.Flags.string({
    char: 'h',
    description: `Neo4j host. Env: '${EnvKeys.HOST}'`,
    env: EnvKeys.HOST,
  }),
  migrationsPath: core.Flags.string({
    char: 'm',
    default: DEFAULT_MIGRATIONS_PATH,
    description: `Migrations path. Env: '${EnvKeys.MIGRATIONS_PATH}'`,
    env: EnvKeys.MIGRATIONS_PATH,
    required: false,
  }),
  password: core.Flags.string({
    char: 'P',
    description: `Neo4j password. Env: '${EnvKeys.PASSWORD}'`,
    env: EnvKeys.PASSWORD,
  }),
  port: core.Flags.integer({
    char: 'p',
    description: `Neo4j port. Env: '${EnvKeys.PORT}'`,
    env: EnvKeys.PORT,
  }),
  scheme: core.Flags.string({
    char: 's',
    description: `Neo4j scheme. Env: '${EnvKeys.SCHEME}'`,
    env: EnvKeys.SCHEME,
    required: false,
  }),
  username: core.Flags.string({
    char: 'u',
    description: `Neo4j username. Env: '${EnvKeys.USERNAME}'`,
    env: EnvKeys.USERNAME,
  }),
} as const

// Method 2: Group flags by purpose and spread them
export const ConnectionFlags = {
  host: baseFlags.host,
  port: baseFlags.port,
  scheme: baseFlags.scheme,
} as const

export const AuthFlags = {
  password: baseFlags.password,
  username: baseFlags.username,
} as const

export const DatabaseFlags = {
  database: baseFlags.database,
} as const

export const ConfigFlags = {
  configFile: baseFlags.configFile,
  migrationsPath: baseFlags.migrationsPath,
} as const
