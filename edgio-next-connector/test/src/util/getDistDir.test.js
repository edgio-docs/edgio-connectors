import getDistDir from '../../../src/util/getDistDir'
import { join } from 'path'

describe('getDistDir', () => {
  let cwd = process.cwd()

  beforeAll(() => {
    jest.resetAllMocks()
  })

  describe('with a custom distDir', () => {
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'custom-dist'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the distDir value from custom-dist dir', () => {
      expect(getDistDir()).toBe('.output')
    })
  })

  describe('with a default config', () => {
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the distDir value from default dir', () => {
      expect(getDistDir()).toBe('.next')
    })
  })

  describe('with no config', () => {
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'no-config'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the distDir value from no-config dir', () => {
      expect(getDistDir()).toBe('.next')
    })
  })

  describe('when config is a function', () => {
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'function'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the distDir value from function dir', () => {
      expect(getDistDir()).toBe('.next')
    })
  })
})
