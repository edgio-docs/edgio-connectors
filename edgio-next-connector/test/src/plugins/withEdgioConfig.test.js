import webpackMerge from 'webpack-merge'

describe('withEdgioConfig', () => {
  let withEdgioConfig, originalCwd

  beforeEach(() => {
    originalCwd = process.cwd()
    jest.resetAllMocks()
    jest.isolateModules(() => {
      jest.mock('@edgio/devtools/widget/install', () => ({}))
      jest.spyOn(console, 'log').mockImplementation(() => {})
      withEdgioConfig = require('../../../src/plugins/withEdgioConfig').withEdgioConfig
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
    process.chdir(originalCwd)
  })

  it('should call the provided webpack config', () => {
    const webpack = jest.fn()
    const result = withEdgioConfig({ webpack })
    const webpackConfig = { output: {}, optimization: {} }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    result.webpack(webpackConfig, options)
    result.webpack(webpackConfig, { isServer: false, webpack: { version: '5.0.0' } })
    expect(webpack).toHaveBeenCalledWith(webpackConfig, options)
  })

  it('should work without being provided a config', () => {
    expect(() => withEdgioConfig()).not.toThrowError()
  })

  it('should preserve target: serverless', () => {
    expect(withEdgioConfig({ target: 'serverless' }).target).toBe('serverless')
  })

  it('should work in production', () => {
    const NODE_ENV = process.env.NODE_ENV

    try {
      process.env.NODE_ENV = 'production'
      const options = { isServer: true, webpack: { version: '4.0.0' } }
      const webpackConfig = { output: {}, optimization: {}, plugins: [] }
      expect(() => withEdgioConfig({}).webpack(webpackConfig, options)).not.toThrowError()
    } finally {
      process.env.NODE_ENV = NODE_ENV
    }
  })

  it('should work without being provided a webpack function', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withEdgioConfig({}).webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should accept a function that returns a config', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withEdgioConfig(() => ({}))().webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should accept empty arguments', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withEdgioConfig().webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should merge config options', () => {
    const NODE_ENV = process.env.NODE_ENV

    try {
      process.env.NODE_ENV = 'production'
      const options = { isServer: true, webpack: { version: '4.0.0' } }
      const webpackConfig = { output: {}, optimization: {}, plugins: [] }

      const expectFn = () =>
        withEdgioConfig({
          test: true,
          webpack(config) {
            return webpackMerge(config, {})
          },
        }).webpack(webpackConfig, options)

      expect(expectFn).not.toThrowError()

      const result = expectFn()
      expect(result).toHaveProperty(
        'optimization.splitChunks.cacheGroups.commons.name',
        'webpack-runtime-commons'
      )
    } finally {
      process.env.NODE_ENV = NODE_ENV
    }
  })
})
