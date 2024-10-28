import {Driver, auth, driver} from 'neo4j-driver'

import {Neo4jConfig} from '../types'

export const getDatabaseConnection = async (dbConfig: Neo4jConfig): Promise<Driver> => {
  const connectionUrl = `${dbConfig.scheme}://${dbConfig.host}:${dbConfig.port}`

  const neo4jDriver = driver(connectionUrl, auth.basic(dbConfig.username, dbConfig.password))

  // Test the connection
  const session = neo4jDriver.session({
    database: dbConfig.database,
  })

  try {
    await session.run('RETURN 1')
  } finally {
    await session.close()
  }

  return neo4jDriver
}
