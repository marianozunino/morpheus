import {crc32} from 'crc'

import {At, In} from '../types'

export const generateChecksum = (statements: string[]): string => {
  let crcValue = 0

  for (const statement of statements) {
    crcValue = crc32(statement, crcValue)
  }

  return crcValue.toString()
}

export const convertInToTime = (inDate: In): string => {
  const seconds = inDate.seconds + inDate.nanoseconds / 1_000_000_000
  return `${seconds}s`
}

export const convertAtToDate = (at: At, timeZoneOffsetSeconds: number): Date => {
  const date = new Date(at.year, at.month - 1, at.day, at.hour, at.minute, at.second, at.nanosecond / 1000)
  date.setSeconds(date.getSeconds() - timeZoneOffsetSeconds)
  return date
}
