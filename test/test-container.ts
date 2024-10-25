import neo4j, {Driver, Session} from 'neo4j-driver'
import {GenericContainer, StartedTestContainer, Wait} from 'testcontainers'

export class Neo4jTestContainer {
  public session: Session | null = null
  private container: GenericContainer
  private driver: Driver | null = null
  private static readonly NEO4J_PORT = 7687
  private static readonly NEO4J_VERSION = '5.13.0'
  private startedContainer: StartedTestContainer | null = null

  constructor() {
    this.container = new GenericContainer(`neo4j:${Neo4jTestContainer.NEO4J_VERSION}`)
      .withExposedPorts(Neo4jTestContainer.NEO4J_PORT)
      .withEnvironment({
        NEO4J_AUTH: 'neo4j/password',
        NEO4J_PLUGINS: '["apoc"]',
        NEO4J_apoc_export_file_enabled: 'true',
        NEO4J_apoc_import_file_enabled: 'true',
        NEO4J_apoc_uuid_enabled: 'true',
        NEO4J_dbms_default__database: 'neo4j',
        NEO4J_dbms_security_procedures_unrestricted: 'apoc.*',
      })
      .withWaitStrategy(Wait.forLogMessage('Started'))
  }

  getDriver(): Driver {
    if (!this.driver) {
      throw new Error('Container not started')
    }

    return this.driver
  }

  public getHost(): string {
    return this.startedContainer!.getHost()
  }

  public getPort(): number {
    return this.startedContainer!.getMappedPort(Neo4jTestContainer.NEO4J_PORT)
  }

  // Helper method to run migrations
  async runMigration(migrationCommand: any): Promise<void> {
    const port = this.startedContainer!.getMappedPort(Neo4jTestContainer.NEO4J_PORT)

    // Assuming your oclif command accepts these parameters
    await migrationCommand.run([
      '--neo4j-uri',
      `neo4j://localhost:${port}`,
      '--neo4j-user',
      'neo4j',
      '--neo4j-password',
      'password',
    ])
  }

  async start(): Promise<void> {
    this.startedContainer = await this.container.start()
    const port = this.startedContainer.getMappedPort(Neo4jTestContainer.NEO4J_PORT)
    const uri = `neo4j://localhost:${port}`
    this.driver = neo4j.driver(uri, neo4j.auth.basic('neo4j', 'password'))

    // Verify APOC is installed
    this.session = this.driver.session()
    try {
      await this.session.run('CALL apoc.help("apoc")')
    } catch {
      throw new Error('APOC plugins not properly installed')
    }
  }

  async stop(): Promise<void> {
    if (this.session) {
      await this.session.close()
    }

    if (this.driver) {
      await this.driver.close()
    }

    if (this.startedContainer) {
      await this.startedContainer.stop()
    }
  }

  public async wipe(): Promise<void> {
    if (this.session) {
      await this.session.run('CALL apoc.schema.assert({}, {})')
      await this.session.run('MATCH (n) DETACH DELETE n')
    }
  }
}
