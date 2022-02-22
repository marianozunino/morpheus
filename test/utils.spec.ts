import rimraf from 'rimraf';
import fs from 'fs';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  createMigrationsFolder,
  createMorpheusFile,
  generateChecksum,
  generateMigration,
  generateMigrationVersion,
  getFileContentAndVersion,
  getMigrationDescription,
  splitFileContentIntoStatements,
} from '../src/utils';
import { crc32 } from 'crc';

describe('utils', () => {
  beforeAll(() => {
    createMigrationsFolder();
  });
  describe('getFileContentAndId', () => {
    beforeEach(() => {
      rimraf.sync(resolve(process.cwd(), 'neo4j/migrations/*'));
    });

    describe('when file has invalid naming', () => {
      it('should fail when file has invalid extension', () => {
        expect.assertions(1);
        try {
          getFileContentAndVersion(new Date().getTime() + '_SomeName.txt');
        } catch (error) {
          expect(error).toMatchInlineSnapshot(
            `[AssertionError: Invalid file name]`,
          );
        }
      });

      it('should fail when file has invalid timestamp', () => {
        expect.assertions(1);
        try {
          getFileContentAndVersion('123' + '_SomeName.cypher');
        } catch (error) {
          expect(error).toMatchInlineSnapshot(
            `[AssertionError: Invalid file name]`,
          );
        }
      });

      it('should handle multiple underscores', () => {
        const fileName = 'V1_1___Some_Name.cypher';
        const filePath = resolve(process.cwd(), './neo4j/migrations', fileName);
        writeFileSync(filePath, 'MIGRATION_CONTENT');

        const { fileContent, version } = getFileContentAndVersion(fileName);
        expect(fileContent).toBe('MIGRATION_CONTENT');
        expect(version).toMatch('1.1');
      });
    });

    it('should fail to read a non existent file', () => {
      expect.assertions(2);
      jest.spyOn(fs, 'readFileSync');
      try {
        const fileName = 'V1_1___Some_Name.cypher';
        getFileContentAndVersion(fileName);
      } catch (error) {
        expect(error).toBeDefined();
        expect(fs.readFileSync).not.toHaveBeenCalled();
      }
    });

    it('should return migrationId and fileContent', () => {
      const fileName = 'V1_1___Some_Name.cypher';
      const filePath = resolve(process.cwd(), './neo4j/migrations', fileName);
      writeFileSync(filePath, 'MIGRATION_CONTENT');
      const { version, fileContent } = getFileContentAndVersion(fileName);
      expect(version).toBe('1.1');
      expect(fileContent).toBe('MIGRATION_CONTENT');
    });
  });

  describe('createMigrationsFolder', () => {
    beforeEach(() => {
      rimraf.sync(resolve(process.cwd(), 'neo4j'));
    });

    it('should create migrations folder', () => {
      expect(fs.existsSync(resolve(process.cwd(), 'neo4j/migrations'))).toBe(
        false,
      );
      createMigrationsFolder();
      expect(fs.existsSync(resolve(process.cwd(), 'neo4j/migrations'))).toBe(
        true,
      );
    });

    it('should create migrations folder only once', () => {
      createMigrationsFolder();
      expect(fs.existsSync(resolve(process.cwd(), 'neo4j/migrations'))).toBe(
        true,
      );
      jest.spyOn(fs, 'mkdirSync');
      createMigrationsFolder();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('generateMigration', () => {
    beforeEach(() => {
      rimraf.sync(resolve(process.cwd(), 'neo4j/migrations/*'));
    });
    it('should generate a migration file', async () => {
      const migrationName = 'migration_name';
      await generateMigration(migrationName);
      expect(
        fs.existsSync(
          resolve(
            process.cwd(),
            'neo4j/migrations',
            `V1_0_0__${migrationName}.cypher`,
          ),
        ),
      ).toBe(true);
    });
  });

  describe('createMorpheusFile', () => {
    const morpheusFilePath = resolve(process.cwd(), '.morpheus.json');
    beforeEach(() => {
      rimraf.sync(morpheusFilePath);
    });
    it('should create a morpheus file', () => {
      expect(fs.existsSync(morpheusFilePath)).toBe(false);
      createMorpheusFile();
      expect(fs.existsSync(morpheusFilePath)).toBe(true);
    });
  });

  describe('getMigrationDescription', () => {
    it('should return the migration name', () => {
      const fileName = 'V1_1___Some_Name.cypher';
      expect(getMigrationDescription(fileName)).toBe('Some Name');
    });

    it('should return error if filename is invalid', () => {
      expect(() => getMigrationDescription('invalid_filename')).toThrow(
        'Invalid file name',
      );
    });
  });

  describe('generateChecksum', () => {
    it('should generate a checksum for multiple lines', () => {
      const statements = [
        'MIGRATION_CONTENT',
        'MIGRATION_CONTENT',
        'MIGRATION_CONTENT',
      ];
      const checksum = generateChecksum(statements);
      expect(checksum).toBe(crc32(statements.join('')).toString());
    });
  });

  describe('splitFileContentIntoStatements', () => {
    it('should split a file content into statements', () => {
      const fileContent = `STATEMENT_1;
       STATEMENT_2;
       STATEMENT_3;
       `;
      const statements = splitFileContentIntoStatements(fileContent);
      expect(statements).toEqual(['STATEMENT_1', 'STATEMENT_2', 'STATEMENT_3']);
    });
  });

  describe('generateMigrationVersion', () => {
    beforeEach(() => {
      rimraf.sync(resolve(process.cwd(), 'neo4j/migrations/*'));
    });
    it('should generate a migration version if there are no previous versions', async () => {
      const version = await generateMigrationVersion();
      expect(version).toBe('1_0_0');
    });
    it('should generate a migration version if there are previous versions', async () => {
      await generateMigration('migration_name_1');
      const version = await generateMigrationVersion();
      expect(version).toBe('2_0_0');
    });
  });
});