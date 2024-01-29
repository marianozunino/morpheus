import { crc32 } from 'crc';

export class ChecksumService {
  public static generateChecksum(statements: string[]): string {
    const crcValue = statements.reduce((acc: number, statement) => {
      return crc32(statement, acc);
    }, undefined);

    return crcValue.toString();
  }
}
