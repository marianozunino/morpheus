/**
 * BFG Database Cleaner
 *
 * This script completely wipes a Neo4j database for testing purposes.
 * It removes ALL data, constraints, indexes, and migration metadata.
 *
 * Usage: npx ts-node bfg.ts [--force] [--uri=neo4j://localhost:7687] [--user=neo4j] [--password=password]
 */

import neo4j, {Driver, Session} from 'neo4j-driver'

const args = process.argv.slice(2)
const params = {
  database: 'neo4j',
  force: args.includes('--force'),
  password: 'password',
  uri: 'neo4j://localhost:7687',
  user: 'neo4j',
}

for (const arg of args) {
  if (arg.startsWith('--uri=')) {
    params.uri = arg.slice(6)
  } else if (arg.startsWith('--user=')) {
    params.user = arg.slice(7)
  } else if (arg.startsWith('--password=')) {
    params.password = arg.slice(11)
  } else if (arg.startsWith('--database=')) {
    params.database = arg.slice(11)
  }
}

function log(message: string, type: 'error' | 'info' | 'warn' = 'info'): void {
  const timestamp = new Date().toISOString()
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️'
  console[type](`${timestamp} ${prefix} ${message}`)
}

async function run(): Promise<void> {
  if (!params.force) {
    console.warn('⚠️ WARNING: This will completely erase your database!')
    console.warn('⚠️ Run with --force to skip this warning.')
    process.exit(1)
  }

  log(`Connecting to Neo4j at ${params.uri}`)
  const driver: Driver = neo4j.driver(params.uri, neo4j.auth.basic(params.user, params.password))

  let session: Session | null = null

  try {
    session = driver.session({database: params.database})

    log('Testing database connection...')
    await session.run('RETURN 1')
    log('Connection successful')

    log('Dropping all constraints and indexes...')

    const dropAllConstraints = async () => {
      const constraints = await session!.run('SHOW CONSTRAINTS')
      for (const record of constraints.records) {
        const name = record.get('name')
        if (name) {
          try {
            await session!.run(`DROP CONSTRAINT ${name}`)
            log(`Dropped constraint: ${name}`)
          } catch (error) {
            log(`Failed to drop constraint ${name}: ${error}`, 'warn')
          }
        }
      }
    }

    const dropAllIndexes = async () => {
      const indexes = await session!.run('SHOW INDEXES')
      for (const record of indexes.records) {
        const name = record.get('name')
        if (name) {
          try {
            await session!.run(`DROP INDEX ${name}`)
            log(`Dropped index: ${name}`)
          } catch (error) {
            log(`Failed to drop index ${name}: ${error}`, 'warn')
          }
        }
      }
    }

    await dropAllConstraints()
    await dropAllIndexes()

    log('All constraints and indexes removed')

    log('Deleting all data...')
    await session.run('MATCH (n) DETACH DELETE n')
    log('All nodes and relationships removed')

    const countResult = await session.run('MATCH (n) RETURN count(n) as count')
    const nodeCount = countResult.records[0].get('count').toNumber()

    if (nodeCount === 0) {
      log('Database successfully wiped clean!')
    } else {
      log(`Database still contains ${nodeCount} nodes. Something went wrong.`, 'error')
    }
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error')
    process.exit(1)
  } finally {
    if (session) {
      await session.close()
    }

    await driver.close()
  }
}

run().catch((error) => {
  log(`Unhandled error: ${error.message}`, 'error')
  process.exit(1)
})
