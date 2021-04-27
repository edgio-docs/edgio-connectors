import withLayer0 from '../../src/withLayer0'
import webpackMerge from 'webpack-merge'

describe('withLayer0', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.mock(
      '@layer0/devtools/widget/install',
      () => {
        const err = new Error()
        err.code = 'MODULE_NOT_FOUND'
        throw err
      },
      { virtual: true }
    )
  })

  it('should call the provided webpack config', () => {
    const webpack = jest.fn()
    const result = withLayer0({ webpack })
    const webpackConfig = { output: {}, optimization: {} }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    result.webpack(webpackConfig, options)
    result.webpack(webpackConfig, { isServer: false, webpack: { version: '5.0.0' } })
    expect(webpack).toHaveBeenCalledWith(webpackConfig, options)
  })

  it('should work without being provided a config', () => {
    expect(() => withLayer0()).not.toThrowError()
  })

  it('should work in production', () => {
    const NODE_ENV = process.env.NODE_ENV

    try {
      process.env.NODE_ENV = 'production'
      const options = { isServer: true, webpack: { version: '4.0.0' } }
      const webpackConfig = { output: {}, optimization: {}, plugins: [] }
      expect(() => withLayer0({}).webpack(webpackConfig, options)).not.toThrowError()
    } finally {
      process.env.NODE_ENV = NODE_ENV
    }
  })

  it('should work without being provided a webpack function', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withLayer0({}).webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should accept a function that returns a config', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withLayer0(() => ({}))().webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should accept empty arguments', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withLayer0().webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should merge config options', () => {
    const NODE_ENV = process.env.NODE_ENV

    try {
      process.env.NODE_ENV = 'production'
      const options = { isServer: true, webpack: { version: '4.0.0' } }
      const webpackConfig = { output: {}, optimization: {}, plugins: [] }

      const expectFn = () =>
        withLayer0({
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

  it('does not add devtools install script in client entries', async () => {
    const options = { isServer: false, webpack: { version: '5.0.0' } }
    const webpackConfig = {
      entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
      output: {},
      optimization: {},
      plugins: [],
    }
    withLayer0({}).webpack(webpackConfig, options)
    expect(await webpackConfig.entry()).toEqual({ 'main.js': ['original-main'] })
  })

  describe('when @layer0/devtools is installed', () => {
    beforeEach(() => {
      jest.mock('@layer0/devtools/widget/install', () => {}, { virtual: true })
    })

    it('should add devtools install script in client entries', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      withLayer0({}).webpack(webpackConfig, options)
      expect(await webpackConfig.entry()).toEqual({
        'main.js': ['@layer0/devtools/widget/install', 'original-main'],
      })
    })

    it('should not add devtools install script to client entries if already present', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () =>
          Promise.resolve({ 'main.js': ['@layer0/devtools/widget/install', 'original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      withLayer0({}).webpack(webpackConfig, options)
      expect(await webpackConfig.entry()).toEqual({
        'main.js': ['@layer0/devtools/widget/install', 'original-main'],
      })
    })
  })

  describe('when require @layer0/devtools/widget/install explodes', () => {
    beforeEach(() => {
      jest.mock(
        '@layer0/devtools/widget/install',
        () => {
          throw new Error('boom')
        },
        { virtual: true }
      )
    })

    it('should crash', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        output: {},
        optimization: {},
        plugins: [],
      }
      expect(() => withLayer0({}).webpack(webpackConfig, options)).toThrowError('boom')
    })
  })
})
