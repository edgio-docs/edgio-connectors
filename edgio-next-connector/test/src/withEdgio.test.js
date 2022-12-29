import webpackMerge from 'webpack-merge'

describe('withEdgio', () => {
  let withEdgio

  beforeEach(() => {
    jest.resetModules()
    jest.isolateModules(() => {
      jest.doMock('../../src/util/getNextVersion', () => () => '10.0.0')

      jest.mock(
        '@edgio/devtools/widget/install',
        () => {
          const err = new Error()
          err.code = 'MODULE_NOT_FOUND'
          throw err
        },
        { virtual: true }
      )

      withEdgio = require('../../src/withEdgio')
    })
  })

  it('should call the provided webpack config', () => {
    const webpack = jest.fn()
    const result = withEdgio({ webpack })
    const webpackConfig = { output: {}, optimization: {} }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    result.webpack(webpackConfig, options)
    result.webpack(webpackConfig, { isServer: false, webpack: { version: '5.0.0' } })
    expect(webpack).toHaveBeenCalledWith(webpackConfig, options)
  })

  it('should work without being provided a config', () => {
    expect(() => withEdgio()).not.toThrowError()
  })

  it('should preserve target: serverless', () => {
    expect(withEdgio({ target: 'serverless' }).target).toBe('serverless')
  })

  it('should work in production', () => {
    const NODE_ENV = process.env.NODE_ENV

    try {
      process.env.NODE_ENV = 'production'
      const options = { isServer: true, webpack: { version: '4.0.0' } }
      const webpackConfig = { output: {}, optimization: {}, plugins: [] }
      expect(() => withEdgio({}).webpack(webpackConfig, options)).not.toThrowError()
    } finally {
      process.env.NODE_ENV = NODE_ENV
    }
  })

  it('should work without being provided a webpack function', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withEdgio({}).webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should accept a function that returns a config', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withEdgio(() => ({}))().webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should accept empty arguments', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withEdgio().webpack(webpackConfig, options)).not.toThrowError()
  })

  it('should merge config options', () => {
    const NODE_ENV = process.env.NODE_ENV

    try {
      process.env.NODE_ENV = 'production'
      const options = { isServer: true, webpack: { version: '4.0.0' } }
      const webpackConfig = { output: {}, optimization: {}, plugins: [] }

      const expectFn = () =>
        withEdgio({
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
    withEdgio({}).webpack(webpackConfig, options)
    expect(await webpackConfig.entry()).toEqual({ 'main.js': ['original-main'] })
  })

  describe('when @edgio/devtools is installed', () => {
    beforeEach(() => {
      jest.mock('@edgio/devtools/widget/install', () => {}, { virtual: true })
    })

    it('should not add devtools if `disableEdgioDevTools` option set to true', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      withEdgio({ disableEdgioDevTools: true }).webpack(webpackConfig, options)
      expect(await webpackConfig.entry()).toEqual({
        'main.js': ['original-main'],
      })
    })

    it('should add devtools install script in client entries', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      withEdgio({}).webpack(webpackConfig, options)
      expect(await webpackConfig.entry()).toEqual({
        'main.js': ['@edgio/devtools/widget/install', 'original-main'],
      })
    })

    it('should not add devtools install script to client entries if already present', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () =>
          Promise.resolve({ 'main.js': ['@edgio/devtools/widget/install', 'original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      withEdgio({}).webpack(webpackConfig, options)
      expect(await webpackConfig.entry()).toEqual({
        'main.js': ['@edgio/devtools/widget/install', 'original-main'],
      })
    })
  })

  describe('when edgioSourceMaps:true is set', () => {
    const env = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_FORCE_SERVER_BUILD = 'true'
    })

    afterEach(() => {
      process.env.NODE_ENV = env
      delete process.env.NEXT_FORCE_SERVER_BUILD
    })

    it('should set devtool: source-map', () => {
      const options = { isServer: true, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      const result = withEdgio({ edgioSourceMaps: true }).webpack(webpackConfig, options)
      expect(result.devtool).toBe('source-map')
    })
  })

  describe('when require @edgio/devtools/widget/install explodes', () => {
    beforeEach(() => {
      jest.mock(
        '@edgio/devtools/widget/install',
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
      expect(() => withEdgio({}).webpack(webpackConfig, options)).toThrowError('boom')
    })
  })
})
