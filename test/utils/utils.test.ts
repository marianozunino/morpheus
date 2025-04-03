import {generateChecksum} from '../../src/services/utils'
import {expect} from 'chai'

const MIGRATION = `CREATE (x:Node {name: "test1"});
CREATE (y:Node {name: "test2"});
CREATE (z:Node {name: "test3"});`

// Original expected CRC value
const ORIGINAL_CRC = '4027232145'

// New CRC value (when using 0 as initial value)
const NEW_CRC = '1131478229'

describe('generateChecksum', () => {
  let originalEnvValue: string | undefined

  beforeEach(() => {
    originalEnvValue = process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION
  })

  afterEach(() => {
    if (originalEnvValue === undefined) {
      delete process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION
    } else {
      process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION = originalEnvValue
    }
  })

  it('should match the original CRC when MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION is true', () => {
    process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION = 'true'
    expect(generateChecksum([MIGRATION])).to.be.equal(ORIGINAL_CRC)
  })

  it('should use the new implementation by default', () => {
    delete process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION
    expect(generateChecksum([MIGRATION])).to.be.equal(NEW_CRC)
  })

  it('should support backward compatibility through environment variable', () => {
    process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION = 'true'
    const originalResult = generateChecksum([MIGRATION])

    delete process.env.MORPHEUS_USE_ORIGINAL_CHECKSUM_IMPLEMENTATION
    const newResult = generateChecksum([MIGRATION])

    expect(originalResult).to.be.equal(ORIGINAL_CRC)
    expect(newResult).to.be.equal(NEW_CRC)
    expect(originalResult).to.not.equal(newResult)
  })
})
