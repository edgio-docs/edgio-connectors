import isTargetSupported from '../../../src/util/isTargetSupported'

describe('isTargetSupported', () => {
  beforeAll(() => {
    jest.resetAllMocks()
  })

  describe('isTargetSupported', () => {
    it('is not supported in 12.2.x', () => {
      expect(isTargetSupported('12.2.0')).toBeFalsy()
    })

    it('is supported in 12.1.x', () => {
      expect(isTargetSupported('12.1.0')).toBeTruthy()
    })

    it("Null means it's supported", () => {
      expect(isTargetSupported(null)).toBeTruthy()
    })

    it('Can handle canary versions with names and such 13+', () => {
      expect(isTargetSupported('13.1.7-canary.15')).toBeFalsy()
    })

    it('Can handle canary versions with names and such 12', () => {
      expect(isTargetSupported('12.1.7-canary.15')).toBeTruthy()
    })
  })
})
