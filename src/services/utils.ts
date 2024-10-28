import {crc32} from 'crc'
import {DateTime, Duration} from 'neo4j-driver'

export const generateChecksum = (statements: string[]): string => {
  let crcValue = 0

  for (const statement of statements) {
    crcValue = crc32(statement, crcValue)
  }

  return crcValue.toString()
}

export const convertInToTime = (inDate: Duration): string => {
  const seconds = inDate.seconds.low + inDate.seconds.high * 2 ** 32
  const nanoseconds = inDate.nanoseconds.low + inDate.nanoseconds.high * 2 ** 32

  const totalSeconds = seconds + nanoseconds / 1_000_000_000
  return `${totalSeconds}s`
}

export const convertAtToDate = (at: DateTime): Date => {
  const date = at.toStandardDate()
  return date
}
