import { Test, TestingModule } from '@nestjs/testing';
import {
  DEFAULT_MIGRATIONS_PATH,
  GLOBAL_CONFIG_TOKEN,
} from 'src/app.constants';
import { Repository } from 'src/db/repository';

import { CliService } from '../cli.service';
import { MigrationService } from '../migration.service';

import { Chance } from 'chance';
import { FsService } from '../fs.service';
import { LazyModuleLoader } from '@nestjs/core';
import { LoggerService } from '../../logger.service';
import { MigrationState } from 'src/types';

const chance = new Chance();
const lazyModuleLoader = jest.fn();

jest.mock('src/db/repository');
jest.mock('../migration.service');
jest.mock('../fs.service');
jest.mock('../../logger.service');
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

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
}));

describe('CliService', () => {
  let service: CliService;
  let repository: jest.Mocked<Repository>;
  let migrationService: jest.Mocked<MigrationService>;
  let fsService: jest.Mocked<FsService>;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CliService,
        {
          provide: GLOBAL_CONFIG_TOKEN,
          useValue: {
            scheme: 'neo4j',
            host: 'localhost',
            port: 7687,
            username: 'neo4j',
            password: 'neo4j',
            migrationsPath: DEFAULT_MIGRATIONS_PATH,
          },
        },
        Repository,
        MigrationService,
        FsService,
        LoggerService,
        LazyModuleLoader,
      ],
    }).compile();
    service = module.get<CliService>(CliService);
    repository = module.get(Repository);
    migrationService = module.get(MigrationService);
    fsService = module.get(FsService);
    loggerService = module.get(LoggerService);

    lazyModuleLoader.mockResolvedValue({
      get: () => repository,
    } as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
    expect(migrationService).toBeDefined();
  });

  describe('createMorpheusFile', () => {
    it('should create the morpheus file', () => {
      const options = {
        force: chance.bool(),
      };
      service.init(options);
      expect(fsService.createMorpheusFile).toBeCalled();
      expect(fsService.createMorpheusFile).toBeCalledWith(options);
    });
  });

  describe('getInfo', () => {
    it('prints a message if there are no migration files', async () => {
      repository.getMigrationInfo.mockResolvedValue([]);
      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([]);

      await service.getInfo();
      expect(loggerService.log).toBeCalled();
      expect(loggerService.log).toBeCalledWith(
        'Database is up to date, but there are no migrations in the migrations folder',
      );
    });

    it('prints an error if there are more migrations in the database than in the migrations folder', async () => {
      const node = {
        version: chance.sentence(),
        type: 'CYPHER',
        checksum: chance.sentence(),
        source: chance.sentence(),
        description: chance.sentence(),
      };

      repository.getMigrationInfo.mockResolvedValue([
        {
          node,
          relations: [],
        } as any,
      ]);
      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([]);
      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      await service.getInfo();
      expect(loggerService.error).toBeCalled();
      expect(loggerService.error).toBeCalledWith(
        'There are more migrations in the database than in the migrations folder',
      );
      expect(consoleTableSpy).toHaveBeenCalled();
      expect(consoleTableSpy).toHaveBeenCalledWith([
        {
          Description: node.description,
          State: MigrationState.APPLIED,
          Type: node.type,
          Version: node.version,
          Source: node.source,
        },
      ]);
    });

    it('prints a table with the migration info', async () => {
      const node = {
        version: '1.0.0',
        type: 'CYPHER',
        checksum: 'checksum',
        source: 'source',
        description: 'description',
      };

      repository.getMigrationInfo.mockResolvedValue([
        {
          node,
          relations: [],
        } as any,
      ]);
      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([
        'V1_0_0__migration_name_1.cypher',
      ]);

      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      await service.getInfo();
      expect(consoleTableSpy).toBeCalled();
    });

    it('prints a table with the migration info and the applied migrations', async () => {
      const node = {
        version: '1.0.0',
        type: 'CYPHER',
        checksum: 'checksum',
        source: 'source',
        description: 'description',
      };

      const At = {
        year: chance.integer({ min: 0, max: 9999 }),
        month: chance.integer({ min: 1, max: 12 }),
        day: chance.integer({ min: 1, max: 31 }),
        hour: chance.integer({ min: 0, max: 23 }),
        minute: chance.integer({ min: 0, max: 59 }),
        second: chance.integer({ min: 0, max: 59 }),
        nanosecond: chance.integer({ min: 0, max: 999999999 }),
        timeZoneOffsetSeconds: chance.integer({ min: -43200, max: 50400 }),
        timeZoneId: chance.string(),
      };

      const In = {
        months: chance.integer({ min: 0, max: 999999999 }),
        days: chance.integer({ min: 0, max: 999999999 }),
        seconds: chance.integer({ min: 0, max: 999999999 }),
        nanoseconds: chance.integer({ min: 0, max: 999999999 }),
      };

      repository.getMigrationInfo.mockResolvedValue([
        {
          node,
          relation: {
            at: At,
            in: In,
          },
        } as any,
      ]);
      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([
        'V1_0_0__migration_name_1.cypher',
      ]);
      fsService.getMigrationVersionFromFileName.mockReturnValue('1.0.0');
      fsService.getMigrationDescriptionFromFileName.mockReturnValue(
        'migration_name_1',
      );

      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      await service.getInfo();
      expect(consoleTableSpy).toBeCalled();
    });
  });

  describe('generateMigration', () => {
    it('should generate a migration file', async () => {
      const migrationName = chance.string({
        alpha: true,
        numeric: false,
        symbols: false,
      });

      await service.generateMigration(migrationName);

      expect(fsService.generateMigration).toBeCalled();
      expect(fsService.generateMigration).toBeCalledWith(migrationName);
    });
  });

  describe('migrate', () => {
    it('should migrate the database', async () => {
      await service.migrate();
      expect(migrationService.migrate).toBeCalled();
    });
  });

  describe('clean', () => {
    it('should clean the database - keep constraints', async () => {
      await service.clean(false);
      expect(repository.dropChain).toBeCalled();
      expect(repository.dropConstraints).not.toBeCalled();
    });

    it('should clean the database - drop constraints', async () => {
      await service.clean(true);
      expect(repository.dropChain).toBeCalled();
      expect(repository.dropConstraints).toBeCalled();
    });
  });
});
