import { crc32 } from 'crc';
import { LoggerService } from './logger.service';
import { At, In } from './types';

export const generateChecksum = (statements: string[]): string => {
  const crcValue = statements.reduce((acc: number, statement) => {
    return crc32(statement, acc);
  }, undefined);

  return crcValue.toString();
};

export const convertInToTime = (inDate: In): string => {
  const seconds = inDate.seconds + inDate.nanoseconds / 1000000000;
  return `${seconds}s`;
};

export const convertAtToDate = (
  at: At,
  timeZoneOffsetSeconds: number,
): Date => {
  const date = new Date(
    at.year,
    at.month - 1,
    at.day,
    at.hour,
    at.minute,
    at.second,
    at.nanosecond / 1000,
  );
  date.setSeconds(date.getSeconds() - timeZoneOffsetSeconds);
  return date;
};
