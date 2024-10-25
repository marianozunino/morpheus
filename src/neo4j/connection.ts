import {Connection} from 'cypher-query-builder'

import {Neo4jConfig} from '../types'

export const getDatabaseConnection = async (dbConfig: Neo4jConfig) => {
  const connectionUrl = `${dbConfig.scheme}://${dbConfig.host}:${dbConfig.port}`

  const connection = new Connection(connectionUrl, {
    password: dbConfig.password,
    username: dbConfig.username,
  })

  if (dbConfig.database) {
    connection.session = function () {
      if (this.open) {
        return this.driver.session({database: dbConfig.database})
      }

      return null
    }
  }

  await connection.query().raw('RETURN 1').run()
  return connection
}
