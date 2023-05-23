import { join } from 'path'
import getNextConfig from '../../../src/getNextConfig'

describe('withDevtools', () => {
  let withDevtools, originalCwd

  beforeEach(() => {
    originalCwd = process.cwd()
    jest.resetAllMocks()
    jest.isolateModules(() => {
      jest.mock('@edgio/core', () => ({
        getConfig: jest.fn(() => {
          const originalGetConfig = jest.requireActual('@edgio/core').getConfig
          // Force getConfig to return fresh config
          return originalGetConfig(true)
        }),
      }))
      jest.mock('@edgio/devtools/widget/install', () => true, { virtual: true })
      jest.spyOn(console, 'log').mockImplementation(() => {})
      withDevtools = require('../../../src/plugins/withDevtools').withDevtools
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
    process.chdir(originalCwd)
  })

  describe('corrupted devtools', () => {
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
    })

    it('should crash', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        output: {},
        optimization: {},
        plugins: [],
      }
      jest.mock(
        '@edgio/devtools/widget/install',
        () => {
          throw new Error('boom')
        },
        { virtual: true }
      )
      expect(() => withDevtools({}).webpack(webpackConfig, options)).toThrowError('boom')
    })
  })

  describe('enabled devtools', () => {
    let nextConfig, modifiedConfig
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
      nextConfig = getNextConfig()
      modifiedConfig = {
        distDir: '.next',
        webpack: expect.any(Function),
      }
    })

    it('should add webpack property with devtools func to next config', () => {
      expect(withDevtools(nextConfig)).toEqual(modifiedConfig)
    })

    it('should add devtools install script in client entries', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      let webpackConfig = {
        entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      webpackConfig = withDevtools({}).webpack(webpackConfig, options)
      const entries = await webpackConfig.entry()
      expect(entries).toEqual({
        'main.js': ['@edgio/devtools/widget/install', 'original-main'],
      })
    })
  })

  describe('disabled devtools', () => {
    let nextConfig, modifiedConfig
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'disabled-config-plugins'))
      nextConfig = getNextConfig()
      modifiedConfig = {
        distDir: '.next',
      }
    })
    it('should not add webpack property with devtools func to next config', () => {
      expect(withDevtools(nextConfig)).toEqual(modifiedConfig)
    })
  })
})
