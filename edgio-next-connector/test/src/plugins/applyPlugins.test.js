describe('applyPlugins', () => {
  let applyPlugins, mockPluginFunc

  beforeEach(() => {
    jest.resetAllMocks()
    jest.isolateModules(() => {
      mockPluginFunc = jest.fn(nextConfig => nextConfig)
      jest.spyOn(console, 'log').mockImplementation(() => {})

      jest.mock('../../../src/plugins/withEdgioConfig', () => ({
        withEdgioConfig: mockPluginFunc,
      }))
      jest.mock('../../../src/plugins/withImageDomainsConfig', () => ({
        withImageDomainsConfig: mockPluginFunc,
      }))
      jest.mock('../../../src/plugins/withImageLoaderConfig', () => ({
        withImageLoaderConfig: mockPluginFunc,
      }))
      applyPlugins = require('../../../src/plugins/applyPlugins').default
    })
  })

  it('should call all plugins', () => {
    const nextConfig = { distDir: 'customDir' }
    expect(applyPlugins(nextConfig)).toEqual(nextConfig)
    expect(mockPluginFunc).toHaveBeenCalledTimes(3)
  })

  it('should work with function as config', () => {
    const nextConfig = { distDir: 'customDir' }
    expect(applyPlugins(() => nextConfig)()).toEqual(nextConfig)
    expect(mockPluginFunc).toHaveBeenCalledTimes(3)
  })
})
