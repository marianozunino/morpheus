import { Test, TestingModule } from '@nestjs/testing';
import { Chance } from 'chance';

import { MigrationService } from '../migration.service';
import { FsService } from '../fs.service';
import { generateChecksum } from '../../utils';
import { BASELINE } from '../../app.constants';
import { LazyModuleLoader } from '@nestjs/core';
import { LoggerService } from '../../logger.service';

import { Repository } from 'src/db/repository';

const chance = new Chance();
const lazyModuleLoader = jest.fn();

jest.mock('src/db/repository');
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
jest.mock('../fs.service');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
}));

const generateRandomCypherQuery = (): string => {
  let lines = chance.n(chance.sentence, chance.integer({ min: 1, max: 5 }));
  lines = lines.map((line) => `${line};\n`);
  return lines.join('');
};

describe('MigrationService', () => {
  let service: MigrationService;

  let repository: jest.Mocked<Repository>;
  let fsService: jest.Mocked<FsService>;
  let loggerService: jest.Mocked<LoggerService>;

  const chance = new Chance();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LazyModuleLoader,
        MigrationService,
        FsService,
        LoggerService,
        Repository,
      ],
    }).compile();
    service = module.get<MigrationService>(MigrationService);
    fsService = module.get(FsService);
    loggerService = module.get(LoggerService);
    repository = module.get(Repository);

    lazyModuleLoader.mockResolvedValue({
      get: () => repository,
    } as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(fsService).toBeDefined();
    expect(loggerService).toBeDefined();
  });

  describe('migrate', () => {
    it('should not migrate if its up to date', async () => {
      const description = chance.string({
        symbols: false,
        alpha: true,
      });
      const version = '1.0.0';
      const source = `V${version.split('.').join('_')}__${description}.cypher`;
      const query = chance.sentence();
      const checksum = generateChecksum([query]);
      const node = {
        version: '1.0.0',
        type: 'CYPHER',
        checksum,
        source,
        description,
      };

      repository.getLatestMigration.mockResolvedValueOnce(node as any);
      repository.getMigrationInfo.mockResolvedValueOnce([
        {
          node: node as any,
          relation: {} as any,
        },
      ]);
      repository.fetchBaselineNode.mockResolvedValueOnce(node as any);

      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([source]);
      fsService.getMigrationVersionFromFileName.mockReturnValueOnce(version);
      fsService.getFileContent.mockResolvedValueOnce(query);

      await service.migrate();

      expect(repository.createConstraints).toBeCalledTimes(0);
      expect(repository.createBaseNode).toBeCalledTimes(0);
      expect(repository.buildMigrationQuery).toBeCalledTimes(0);
      expect(loggerService.log).toBeCalledTimes(1);
      expect(loggerService.log).toBeCalledWith('Database is up to date');
    });

    it('should migrate if a migration was modified after it was applied', async () => {
      const description = chance.string({
        symbols: false,
      });

      const version = '1.0.0';
      const source = `V${version.split('.').join('_')}__${description}.cypher`;

      const checksum = generateChecksum([generateRandomCypherQuery()]);

      const node = {
        version: '1.0.0',
        type: 'CYPHER',
        checksum,
        source,
        description,
      };

      repository.fetchBaselineNode.mockResolvedValueOnce(node as any);
      repository.getLatestMigration.mockResolvedValueOnce(node as any);
      repository.getMigrationInfo.mockResolvedValueOnce([
        {
          node: node as any,
          relation: {} as any,
        },
      ]);

      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([source]);
      fsService.getFileContent.mockResolvedValueOnce(
        generateRandomCypherQuery(),
      );

      repository.getTransaction.mockReturnValueOnce({
        commit: jest.fn(),
        run: jest.fn(),
      } as any);

      await expect(service.migrate()).rejects.toThrowError(
        `The checksum of ${source} does not match the checksum in the database`,
      );

      expect(repository.createConstraints).toBeCalledTimes(0);
      expect(repository.createBaseNode).toBeCalledTimes(0);
    });

    it('should create the baseline if it does not exist', async () => {
      const description = chance.string({
        symbols: false,
      });

      const version = '1.0.0';
      const source = `V${version.split('.').join('_')}__${description}.cypher`;

      const node = {
        version: BASELINE,
      };

      repository.fetchBaselineNode.mockResolvedValueOnce(null);
      repository.getLatestMigration.mockResolvedValueOnce(node as any);
      repository.getMigrationInfo.mockResolvedValueOnce([]);

      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([source]);
      fsService.getMigrationVersionFromFileName.mockReturnValueOnce(version);
      fsService.getFileContent.mockResolvedValueOnce(source);

      repository.getTransaction.mockReturnValueOnce({
        commit: jest.fn(),
        run: jest.fn(),
      } as any);

      await service.migrate();

      expect(repository.createConstraints).toBeCalledTimes(1);
      expect(repository.createBaseNode).toBeCalledTimes(1);
      expect(loggerService.log).toBeCalledTimes(1);
      expect(loggerService.log).toBeCalledWith(
        `Executing migration: ${source}`,
      );
    });

    it('should apply a migration that exists only in the file system', async () => {
      const description = chance.string({
        symbols: false,
      });

      const version = '1.0.0';
      const source = `V${version.split('.').join('_')}__${description}.cypher`;

      repository.fetchBaselineNode.mockResolvedValueOnce({
        version: BASELINE,
      } as any);

      repository.getLatestMigration.mockResolvedValueOnce({
        version: BASELINE,
      } as any);

      repository.getMigrationInfo.mockResolvedValue([]);

      fsService.getFileNamesFromMigrationsFolder.mockResolvedValue([source]);
      fsService.getMigrationVersionFromFileName.mockReturnValue(version);
      fsService.getFileContent.mockResolvedValueOnce(
        generateRandomCypherQuery(),
      );
      fsService.getMigrationDescriptionFromFileName.mockReturnValueOnce(
        description,
      );

      const commit = jest.fn();
      const run = jest.fn();
      const trx = {
        commit,
        run,
      } as any;
      repository.getTransaction.mockReturnValueOnce(trx);

      await service.migrate();

      expect(repository.createConstraints).toBeCalledTimes(0);
      expect(repository.createBaseNode).toBeCalledTimes(0);
      expect(repository.buildMigrationQuery).toBeCalledTimes(1);
      expect(repository.buildMigrationQuery).toBeCalledWith(
        {
          checksum: expect.any(String),
          description,
          source,
          type: 'CYPHER',
          version,
        },
        BASELINE,
        expect.any(Number),
      );
      expect(loggerService.log).toBeCalledTimes(1);
      expect(loggerService.log).toBeCalledWith(
        `Executing migration: ${source}`,
      );
      expect(commit).toBeCalledTimes(1);
      expect(repository.executeQuery).toBeCalledTimes(1);
      expect(repository.executeQueries).toBeCalledTimes(1);
      expect(repository.executeQueries).toBeCalledWith(expect.any(Array), trx);
      expect(repository.getTransaction).toBeCalledTimes(1);
    });
  });
});
