import loadConfig from '@layer0/next/router/loadConfig'
import { join } from 'path'

describe('loadConfig', () => {
  let cwd

  describe('with config', () => {
    beforeAll(() => {
      cwd = process.cwd()
      process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the config', () => {
      expect(loadConfig()).toEqual({ foo: 'bar' })
    })
  })
  describe('without config', () => {
    beforeAll(() => {
      cwd = process.cwd()
      process.chdir(join(__dirname, '..', '..', 'apps', 'no-config'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the config', () => {
      expect(loadConfig()).toEqual({})
    })
  })
  describe('function', () => {
    beforeAll(() => {
      cwd = process.cwd()
      process.chdir(join(__dirname, '..', '..', 'apps', 'function'))
    })
    afterAll(() => {
      process.chdir(cwd)
    })
    it('should return the config', () => {
      expect(loadConfig()).toEqual({ foo: 'bar' })
    })
  })
})
