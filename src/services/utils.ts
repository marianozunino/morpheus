import {crc32} from 'crc'
import {DateTime, Duration} from 'neo4j-driver'

/**
 * Generates a CRC32 checksum from an array of string statements.
 *
 * The behavior of this function is controlled by the environment variable
 * 'MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION'. When set to 'true', it uses
 * the original implementation with undefined as the initial value.
 *
 * @param {string[]} statements - An array of strings to calculate the checksum from
 * @returns {string} The calculated CRC32 checksum as a string
 *
 * @example
 * // Set environment variable for original implementation (recommended)
 * // process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION = 'true'
 * const checksum = generateChecksum(statements);
 *
 * @deprecated The default behavior (with initial value of 0) is deprecated and will be removed
 * in a future version. Please set MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION='true' in your
 * environment for consistent behavior with previous versions.
 */
export const generateChecksum = (statements: string[]): string => {
  // Check environment variable for original implementation flag
  const useOriginalImplementation = process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION === 'true'

  // Use undefined as initial value if original implementation is requested
  let crcValue = useOriginalImplementation ? undefined : 0

  for (const statement of statements) {
    crcValue = crc32(statement, crcValue)
  }

  return crcValue!.toString()
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
