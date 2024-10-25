import {mkdirp, writeFile, readdir} from 'fs-extra'

export const simplePath = 'simplePath'
export const nestedPath = 'nestedPath/one'

export const createMigrationFile = async (): Promise<void> => {
  await mkdirp(DEFAULT_MIGRATIONS_PATH)
  const files = await readdir(DEFAULT_MIGRATIONS_PATH)
  const lastMigration = files[files.length - 1]

  const lastMigrationNumber = !!lastMigration ? +lastMigration.split('_')[0].slice(1) : 0

  const newMigrationNumber = lastMigrationNumber + 1
  const newMigrationName = `V${lastMigrationNumber}_0_0__${newMigrationNumber}.cypher`
  const fileContent = `CREATE (agent:\`007\`) RETURN agent;`
  await writeFile(`${DEFAULT_MIGRATIONS_PATH}/${newMigrationName}`, fileContent)
}
