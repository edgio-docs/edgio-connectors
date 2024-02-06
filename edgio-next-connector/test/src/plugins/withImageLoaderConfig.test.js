describe('withImageLoaderConfig', () => {
  let withImageLoaderConfig,
    nextConfig,
    modifiedNextConfig,
    mockEdgioConfig,
    mockIsCloud,
    mockIsProductionBuild,
    mockNextVersion

  beforeEach(() => {
    jest.resetAllMocks()
    jest.isolateModules(() => {
      jest.mock('@edgio/core', () => ({
        getConfig: jest.fn(() => mockEdgioConfig),
      }))
      jest.mock('@edgio/core/environment', () => ({
        isCloud: jest.fn(() => mockIsCloud),
        isProductionBuild: jest.fn(() => mockIsProductionBuild),
      }))
      jest.spyOn(console, 'log').mockImplementation(() => {})
      jest.mock('../../../src/util/getNextVersion', () => jest.fn(() => mockNextVersion))
      withImageLoaderConfig =
        require('../../../src/plugins/withImageLoaderConfig').withImageLoaderConfig
    })
    mockIsCloud = true
    mockIsProductionBuild = true
    nextConfig = {
      distDir: '.next',
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  describe('Enabled Edgio Image Optimizer', () => {
    beforeAll(() => {
      mockEdgioConfig = {
        next: {
          disableImageOptimizer: false,
        },
      }
      modifiedNextConfig = {
        distDir: '.next',
        images: {
          loader: 'custom',
          loaderFile: 'src/imageLoader.js',
        },
      }
      mockNextVersion = '14.0.0'
    })

    it('should add our image loader', () => {
      expect(withImageLoaderConfig(nextConfig)).toEqual(modifiedNextConfig)
    })

    it('should add our image loader and work with function as next config', () => {
      expect(withImageLoaderConfig(() => nextConfig)()).toEqual(modifiedNextConfig)
    })

    it('should not add our image loader if there is another loader defined by user', () => {
      const withCustomLoader = {
        ...nextConfig,
        images: {
          loader: 'akamai',
        },
      }
      expect(withImageLoaderConfig(withCustomLoader)).toEqual(withCustomLoader)
    })
  })

  describe('Disabled Edgio Image Optimizer', () => {
    beforeAll(() => {
      mockEdgioConfig = {
        next: {
          disableImageOptimizer: true,
        },
      }
      mockNextVersion = '14.0.0'
    })

    it('should not add our image loader', () => {
      expect(withImageLoaderConfig(nextConfig)).toEqual(nextConfig)
    })
  })

  describe('Next.js version 12 and older', () => {
    beforeAll(() => {
      mockEdgioConfig = {}
      mockNextVersion = '12.0.0'
      modifiedNextConfig = {
        distDir: '.next',
        images: {
          path: '/',
          loader: 'imgix',
        },
      }
    })

    it('should add our image loader under imgix name', () => {
      expect(withImageLoaderConfig(nextConfig)).toEqual(modifiedNextConfig)
    })
  })
})
