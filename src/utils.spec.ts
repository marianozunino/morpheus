import rimraf from 'rimraf';
import fs from 'fs';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  createMigrationsFolder,
  createMorpheusFile,
  generateMigration,
  getFileContentAndId,
  getMigrationName,
} from './utils';

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
          getFileContentAndId(new Date().getTime() + '_SomeName.txt');
        } catch (error) {
          expect(error).toMatchInlineSnapshot(
            `[AssertionError: Invalid file name]`,
          );
        }
      });

      it('should fail when file has invalid timestamp', () => {
        expect.assertions(1);
        try {
          getFileContentAndId('123' + '_SomeName.cypher');
        } catch (error) {
          expect(error).toMatchInlineSnapshot(
            `[AssertionError: Invalid file name]`,
          );
        }
      });

      it('should handle multiple underscores', () => {
        const fileName = new Date().getTime() + '_Some_Name.cypher';
        const filePath = resolve(process.cwd(), './neo4j/migrations', fileName);
        writeFileSync(filePath, 'MIGRATION_CONTENT');

        const { fileContent, migrationId } = getFileContentAndId(fileName);
        expect(fileContent).toBe('MIGRATION_CONTENT');
        expect(migrationId).toMatch(/^\d{13}$/);
      });
    });

    it('should fail to read a non existent file', () => {
      expect.assertions(2);
      jest.spyOn(fs, 'readFileSync');
      try {
        getFileContentAndId(new Date().getTime() + '_SomeName.cypher');
      } catch (error) {
        expect(error).toBeDefined();
        expect(fs.readFileSync).not.toHaveBeenCalled();
      }
    });

    it('should return migrationId and fileContent', () => {
      const fileName = new Date().getTime() + '_SomeName.cypher';
      const filePath = resolve(process.cwd(), './neo4j/migrations', fileName);
      writeFileSync(filePath, 'MIGRATION_CONTENT');
      const { migrationId, fileContent } = getFileContentAndId(fileName);
      expect(migrationId).toBe(fileName.split('_')[0]);
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
    it('should generate a migration file', () => {
      const mockDate = new Date();
      const spy = jest
        .spyOn(global, 'Date')
        .mockImplementationOnce(() => mockDate as unknown as string);
      const migrationName = 'migration_name';
      generateMigration(migrationName);
      spy.mockRestore();
      expect(
        fs.existsSync(
          resolve(
            process.cwd(),
            'neo4j/migrations',
            `${mockDate.getTime()}_${migrationName}.cypher`,
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

  describe('getMigrationName', () => {
    it('should return the migration name', () => {
      const migrationName = 'migration_name';
      const fileName = new Date().getTime() + '_' + migrationName + '.cypher';
      expect(getMigrationName(fileName)).toBe(migrationName);
    });

    it('should return error if filename is invalid', () => {
      expect(() => getMigrationName('invalid_filename')).toThrow(
        'Invalid file name',
      );
    });
  });
});
