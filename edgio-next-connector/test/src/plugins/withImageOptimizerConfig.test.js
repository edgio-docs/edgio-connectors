import { join } from 'path'
import getNextConfig from '../../../src/getNextConfig'

describe('withImageOptimizerConfig', () => {
  let withImageOptimizerConfig, originalCwd

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
      jest.spyOn(console, 'log').mockImplementation(() => {})
      withImageOptimizerConfig =
        require('../../../src/plugins/withImageOptimizerConfig').withImageOptimizerConfig
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
    process.chdir(originalCwd)
  })

  describe('enabled edgio image optimizer', () => {
    let nextConfig, modifiedConfig

    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
      nextConfig = getNextConfig()
      modifiedConfig = {
        distDir: '.next',
        images: {
          domains: [],
        },
      }
    })
    it('should not add image domains to next config', () => {
      expect(withImageOptimizerConfig(nextConfig)).toEqual(modifiedConfig)
    })

    it('should work with function as next config', () => {
      expect(withImageOptimizerConfig(() => nextConfig)()).toEqual(modifiedConfig)
    })
  })

  describe('disabled edgio image optimizer', () => {
    let nextConfig, modifiedConfig
    beforeAll(() => {
      process.chdir(join(__dirname, '..', '..', 'apps', 'disabled-config-plugins'))
      nextConfig = getNextConfig()
      modifiedConfig = {
        distDir: '.next',
        images: {
          domains: ['localhost', '127.0.0.1', '[::1]', 'SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE'],
        },
      }
    })
    it('should add image domains to next config', () => {
      expect(withImageOptimizerConfig(nextConfig)).toEqual(modifiedConfig)
    })
    it('should work with function as next config', () => {
      expect(withImageOptimizerConfig(() => nextConfig)()).toEqual(modifiedConfig)
    })
  })
})
