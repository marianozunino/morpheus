import { Neo4jMigrationNode } from '../../src/types';
import { Repository } from '../../src/repository';
import { Transaction } from 'neo4j-driver-core';

export class RepositoryMock extends Repository {
  constructor() {
    super(null);
  }
  public getTransaction(): Transaction {
    return {
      run: jest.fn(),
      commit: jest.fn(),
    } as any;
  }

  public buildMigrationQuery(
    _neo4jMigration: Neo4jMigrationNode,
    _fromVersion: string,
    _duration: number,
  ): string {
    return '';
  }
}
