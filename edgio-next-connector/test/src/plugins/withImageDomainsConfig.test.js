describe('withImageDomainsConfig', () => {
  let withImageDomainsConfig, nextConfig, modifiedNextConfig, mockNextVersion

  beforeEach(() => {
    jest.resetAllMocks()
    jest.isolateModules(() => {
      jest.mock('../../../src/util/getNextVersion', () => jest.fn(() => mockNextVersion))
      jest.spyOn(console, 'log').mockImplementation(() => {})
      withImageDomainsConfig =
        require('../../../src/plugins/withImageDomainsConfig').withImageDomainsConfig
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  describe('Next.js 11 and older versions', () => {
    beforeAll(() => {
      mockNextVersion = '10.0.0'
      nextConfig = {
        distDir: '.next',
        images: {
          domains: ['custom-domain.com'],
        },
      }
      modifiedNextConfig = {
        distDir: '.next',
        images: {
          domains: [
            'localhost',
            '127.0.0.1',
            '[::1]',
            'SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE',
            'custom-domain.com',
          ],
        },
      }
    })

    it('should add image domains to next config', () => {
      expect(withImageDomainsConfig(nextConfig)).toEqual(modifiedNextConfig)
    })
    it('should work with function as next config', () => {
      expect(withImageDomainsConfig(() => nextConfig)()).toEqual(modifiedNextConfig)
    })
  })

  describe('Next.js 12 and newer versions', () => {
    beforeAll(() => {
      mockNextVersion = '14.0.0'
      nextConfig = {
        distDir: '.next',
        images: {
          remotePatterns: [
            {
              hostname: 'custom-domain.com',
            },
          ],
        },
      }
      modifiedNextConfig = {
        distDir: '.next',
        images: {
          remotePatterns: [
            {
              hostname: 'localhost',
            },
            {
              hostname: '127.0.0.1',
            },
            {
              hostname: '[::1]',
            },
            {
              hostname: 'SET_EDGIO_IMAGE_OPTIMIZER_HOST_HERE',
            },
            {
              hostname: 'custom-domain.com',
            },
          ],
        },
      }
    })

    it('should add image remote patterns to next config', () => {
      expect(withImageDomainsConfig(nextConfig)).toEqual(modifiedNextConfig)
    })

    it('should work with function as next config', () => {
      expect(withImageDomainsConfig(() => nextConfig)()).toEqual(modifiedNextConfig)
    })
  })
})
