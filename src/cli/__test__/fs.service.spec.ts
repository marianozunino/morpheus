import { Test, TestingModule } from '@nestjs/testing';
import { FsService } from '../fs.service';
import fs from 'fs';
import { LazyModuleLoader } from '@nestjs/core';
import { Chance } from 'chance';
import { LoggerService } from '../../logger.service';
import mollusc from 'mollusc';
import { Neo4jConfig, Neo4jScheme } from '../../config/config-loader';
import { DEFAULT_MIGRATIONS_PATH } from '../../app.constants';

const lazyModuleLoader = jest.fn();

jest.mock(
  '@nestjs/core',
  () =>
    ({
      ...jest.requireActual('@nestjs/core'),
      LazyModuleLoader: jest.fn().mockImplementation(() => ({
        load: lazyModuleLoader,
      })),
    } as any),
);
jest.mock('../../logger.service');
jest.mock('src/db/repository');
jest.mock('../migration.service');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
}));

describe('FsService', () => {
  let service: FsService;
  const chance = new Chance();
  let loggerService: jest.Mocked<LoggerService>;

  const config: Neo4jConfig = {
    scheme: Neo4jScheme.NEO4J,
    host: 'localhost',
    port: 7687,
    username: 'neo4j',
    password: 'neo4j',
    migrationsPath: DEFAULT_MIGRATIONS_PATH,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FsService, LazyModuleLoader, LoggerService],
    }).compile();
    service = module.get<FsService>(FsService);
    loggerService = module.get(LoggerService);

    lazyModuleLoader.mockResolvedValue({
      get: () => config,
    } as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMorpheusFile', () => {
    describe('when the file does not exist', () => {
      it('should create the file', () => {
        const existsSyncSpy = jest.spyOn(fs, 'existsSync');
        existsSyncSpy.mockImplementation(() => false);
        const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync');
        writeFileSyncSpy.mockImplementation(() => {});
        service.createMorpheusFile({});
        expect(writeFileSyncSpy).toBeCalled();
        // expect(writeFileSyncSpy).toBeCalledWith();
        expect(loggerService.log).toBeCalled();
        expect(loggerService.log).toBeCalledWith(
          'Morpheus file created: .morpheus.json',
        );
      });
    });

    describe('when the file exists', () => {
      it('should not create the file if the force option is not set', () => {
        expect(() => {
          const existsSyncSpy = jest.spyOn(fs, 'existsSync');
          existsSyncSpy.mockImplementation(() => true);

          const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync');
          service.createMorpheusFile({
            force: false,
          });
          expect(writeFileSyncSpy).not.toBeCalled();
          expect(loggerService.log).not.toBeCalled();
        }).toThrow('Morpheus file already exists: .morpheus.json');
      });
      it('should create the file if the force option is set', () => {
        const existsSyncSpy = jest.spyOn(fs, 'existsSync');
        existsSyncSpy.mockImplementation(() => true);

        const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync');
        service.createMorpheusFile({
          force: true,
        });
        expect(writeFileSyncSpy).toBeCalled();
        expect(loggerService.log).toBeCalled();
        expect(loggerService.log).toBeCalledWith(
          'Morpheus file created: .morpheus.json',
        );
      });
    });
  });

  describe('getFileNamesFromMigrationsFolder', () => {
    it('should return the file names', async () => {
      const fileNames = [chance.name(), chance.name()];

      const readDirSyncSpy = jest.spyOn(fs, 'readdirSync');
      readDirSyncSpy.mockImplementation(() => fileNames as any);

      const result = await service.getFileNamesFromMigrationsFolder();
      expect(result).toEqual(fileNames);
    });
  });

  describe('getFileContent', () => {
    it('should return the file content', async () => {
      const fileContent = chance.sentence();

      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
      readFileSyncSpy.mockImplementation(() => fileContent);

      const result = await service.getFileContent(chance.name());
      expect(result).toBe(fileContent);
    });

    it('should throw an error if the file does not exist', async () => {
      const existsSyncSpy = jest.spyOn(fs, 'existsSync');
      existsSyncSpy.mockImplementation(() => false);

      const fileName = chance.name();
      await expect(() => service.getFileContent(fileName)).rejects.toThrow(
        `Missing migration: ${fileName}. Neo4j reports it as applied, but it is missing locally.`,
      );
    });
  });

  describe('getMigrationVersionFromFileName', () => {
    it('should return the migration version', () => {
      const migrationVersion = `${chance.integer({ min: 0 })}_${chance.integer({
        min: 0,
      })}_${chance.integer({ min: 0 })}`;
      const fileName = `V${migrationVersion}__${chance.name()}.cypher`;
      const migrationVersionResult =
        service.getMigrationVersionFromFileName(fileName);
      expect(migrationVersionResult).toBe(migrationVersion.replace(/_/g, '.'));
    });

    it('should fail if the file name is not valid', () => {
      const fileName = chance.name();
      expect(() => service.getMigrationVersionFromFileName(fileName)).toThrow(
        `Invalid migration file name: ${fileName}`,
      );
    });
  });

  describe('getMigrationDescriptionFromFileName', () => {
    it('should return the migration description', () => {
      const migrationDescription = chance.name();
      const fileName = `V1_0_0__${migrationDescription}.cypher`;
      const migrationDescriptionResult =
        service.getMigrationDescriptionFromFileName(fileName);
      expect(migrationDescriptionResult).toBe(migrationDescription);
    });

    it('should fail if the file name is not valid', () => {
      const fileName = chance.name();
      expect(() =>
        service.getMigrationDescriptionFromFileName(fileName),
      ).toThrow(`Invalid migration file name: ${fileName}`);
    });
  });

  describe('validateFileName', () => {
    it('should validate the file name', () => {
      const fileName = `V1_0_0__${chance.name()}.cypher`;
      expect(() => service.validateFileName(fileName)).not.toThrow();
    });

    it('should fail if the file name is not valid', () => {
      const fileName = chance.name();
      expect(() => service.validateFileName(fileName)).toThrow(
        `Invalid migration file name: ${fileName}`,
      );
    });
  });

  describe('generateMigration', () => {
    it('should create a new migration file and folder', async () => {
      jest
        .spyOn(service, 'getFileNamesFromMigrationsFolder')
        .mockResolvedValue([]);

      const migrationName = chance.string({
        symbols: false,
        alpha: true,
      });

      await service.generateMigration(migrationName);
      expect(loggerService.log).toBeCalledWith(
        `Migration file created: neo4j/migrations/V1_0_0__${migrationName}.cypher`,
      );

      expect(loggerService.log).toBeCalledWith(
        'Migrations folder created: neo4j/migrations',
      );
      expect(loggerService.log).toBeCalledTimes(2);
    });

    it('should create a new migration file in an existing folder', async () => {
      const existsSyncSpy = jest.spyOn(fs, 'existsSync');
      existsSyncSpy.mockImplementation(() => true);

      jest
        .spyOn(service, 'getFileNamesFromMigrationsFolder')
        .mockResolvedValue([]);

      const migrationName = chance.string({
        symbols: false,
        alpha: true,
      });

      await service.generateMigration(migrationName);

      expect(loggerService.log).toBeCalledTimes(1);
      expect(loggerService.log).toBeCalledWith(
        `Migration file created: neo4j/migrations/V1_0_0__${migrationName}.cypher`,
      );
    });

    it('should create a new migration file with the next version', async () => {
      const fileNames = [
        'V1_0_0__first_migration.cypher',
        'V1_0_1__second_migration.cypher',
      ];

      jest
        .spyOn(service, 'getFileNamesFromMigrationsFolder')
        .mockResolvedValue(fileNames);

      const migrationName = chance.string({
        symbols: false,
        alpha: true,
      });

      await service.generateMigration(migrationName);

      expect(loggerService.log).toBeCalledWith(
        `Migration file created: neo4j/migrations/V2_0_0__${migrationName}.cypher`,
      );
    });

    it('should convert unsafe characters to underscores', async () => {
      jest
        .spyOn(service, 'getFileNamesFromMigrationsFolder')
        .mockResolvedValue([]);

      const migrationName = chance.string({
        symbols: true,
        alpha: false,
      });

      await service.generateMigration(migrationName);

      expect(loggerService.log).toBeCalledWith(
        `Migration file created: neo4j/migrations/V1_0_0__${mollusc(
          migrationName,
          { lower: false },
        )}.cypher`,
      );
    });
  });
});
