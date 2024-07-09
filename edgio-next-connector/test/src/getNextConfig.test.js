import getNextConfig from '@edgio/next/getNextConfig'
import { join } from 'path'

describe('getNextConfig', () => {
  let cwd

  describe('with config', () => {
    beforeAll(() => {
      cwd = process.cwd()
      process.chdir(join(__dirname, '..', 'apps/default/.edgio/lambda/app'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the config', () => {
      expect(getNextConfig()).toEqual({ distDir: '.next' })
    })
  })
  describe('without config', () => {
    beforeAll(() => {
      cwd = process.cwd()
      process.chdir(join(__dirname, '..', 'apps', 'no-config'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the config', () => {
      expect(getNextConfig()).toEqual({})
    })
  })
  describe('function', () => {
    beforeAll(() => {
      cwd = process.cwd()
      process.chdir(join(__dirname, '..', 'apps', 'function'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the config', () => {
      expect(getNextConfig()).toEqual({ foo: 'bar' })
    })
  })
})
