import withXDN from '../../src/withXDN'

describe('withXDN', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.mock(
      '@xdn/devtools/widget/install',
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
    const result = withXDN({ webpack })
    const webpackConfig = { output: {}, optimization: {} }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    result.webpack(webpackConfig, options)
    result.webpack(webpackConfig, { isServer: false, webpack: { version: '5.0.0' } })
    expect(webpack).toHaveBeenCalledWith(webpackConfig, options)
  })

  it('should work without being provided a config', () => {
    expect(() => withXDN()).not.toThrowError()
  })

  it('should work in production', () => {
    const NODE_ENV = process.env.NODE_ENV

    try {
      process.env.NODE_ENV = 'production'
      const options = { isServer: true, webpack: { version: '4.0.0' } }
      const webpackConfig = { output: {}, optimization: {}, plugins: [] }
      expect(() => withXDN({}).webpack(webpackConfig, options)).not.toThrowError()
    } finally {
      process.env.NODE_ENV = NODE_ENV
    }
  })

  it('should work without being provided a webpack function', () => {
    const webpackConfig = { output: {}, optimization: {}, plugins: [] }
    const options = { isServer: true, webpack: { version: '5.0.0' } }
    expect(() => withXDN({}).webpack(webpackConfig, options)).not.toThrowError()
  })

  it('does not add devtools install script in client entries', async () => {
    const options = { isServer: false, webpack: { version: '5.0.0' } }
    const webpackConfig = {
      entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
      output: {},
      optimization: {},
      plugins: [],
    }
    withXDN({}).webpack(webpackConfig, options)
    expect(await webpackConfig.entry()).toEqual({ 'main.js': ['original-main'] })
  })

  describe('when @xdn/devtools is installed', () => {
    beforeEach(() => {
      jest.mock('@xdn/devtools/widget/install', () => {}, { virtual: true })
    })

    it('should add devtools install script in client entries', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () => Promise.resolve({ 'main.js': ['original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      withXDN({}).webpack(webpackConfig, options)
      expect(await webpackConfig.entry()).toEqual({
        'main.js': ['@xdn/devtools/widget/install', 'original-main'],
      })
    })

    it('should not add devtools install script to client entries if already present', async () => {
      const options = { isServer: false, webpack: { version: '5.0.0' } }
      const webpackConfig = {
        entry: () =>
          Promise.resolve({ 'main.js': ['@xdn/devtools/widget/install', 'original-main'] }),
        output: {},
        optimization: {},
        plugins: [],
      }
      withXDN({}).webpack(webpackConfig, options)
      expect(await webpackConfig.entry()).toEqual({
        'main.js': ['@xdn/devtools/widget/install', 'original-main'],
      })
    })
  })

  describe('when require @xdn/devtools/widget/install explodes', () => {
    beforeEach(() => {
      jest.mock(
        '@xdn/devtools/widget/install',
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
      expect(() => withXDN({}).webpack(webpackConfig, options)).toThrowError('boom')
    })
  })
})
