import { Test } from '@nestjs/testing';
import { MorpheusService } from './morpheus.service';

const migratorImpl = {
  migrate: jest.fn(),
};

const connectionImpl = {
  close: jest.fn(),
  driver: {
    verifyConnectivity: jest.fn(),
  },
};

jest.mock('cypher-query-builder', () => ({
  Connection: jest.fn(() => connectionImpl),
}));

jest.mock('../migrator.ts', () => ({
  Migrator: jest.fn(() => migratorImpl),
}));

describe('PouchService', () => {
  let service: MorpheusService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: MorpheusService,
          useValue: new MorpheusService({
            host: 'localhost',
            port: 5984,
            scheme: 'neo4j',
            username: 'test',
            password: 'test',
          }),
        },
      ],
    }).compile();

    service = moduleRef.get<MorpheusService>(MorpheusService);
  });

  describe('onModuleInit', () => {
    it("should fail if can't connect to database", async () => {
      connectionImpl.driver.verifyConnectivity.mockRejectedValue(
        new Error('Connection error'),
      );
      await expect(service.onModuleInit()).rejects.toThrowError(
        'Connection error',
      );
      expect(connectionImpl.close).toHaveBeenCalled();
      expect(connectionImpl.driver.verifyConnectivity).toHaveBeenCalled();
    });
    it('should execute migrations if can connect to database', async () => {
      connectionImpl.driver.verifyConnectivity.mockResolvedValue(true);
      await service.onModuleInit();
      expect(connectionImpl.driver.verifyConnectivity).toHaveBeenCalled();
      expect(migratorImpl.migrate).toHaveBeenCalled();
    });
    it('should log and close connection if error', async () => {
      migratorImpl.migrate.mockRejectedValue(new Error('Migration error'));
      await expect(service.onModuleInit()).rejects.toThrowError(
        'Migration error',
      );
      expect(connectionImpl.close).toHaveBeenCalled();
      expect(connectionImpl.driver.verifyConnectivity).toHaveBeenCalled();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
