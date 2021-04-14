describe('CommonsServerChunkPlugin', () => {
  let CommonsServerChunkPlugin,
    hook,
    compilationHook,
    replaceFn,
    filename,
    compiler,
    updateAsset,
    old,
    source

  beforeEach(() => {
    jest.isolateModules(() => {
      compiler = {
        hooks: {
          compilation: {
            tap: (name, h) => {
              compilationHook = h
            },
          },
          emit: {
            tap: (name, h) => {
              hook = h
            },
          },
        },
      }

      jest.spyOn(console, 'log').mockImplementation()

      updateAsset = jest.fn((file, fn) => {
        filename = file
        replaceFn = fn
      })

      source = '(function(modules){})({});'

      jest.doMock('webpack', () => {
        return {
          Compilation: {
            PROCESS_ASSETS_STAGE_ADDITIONAL: 'PROCESS_ASSETS_STAGE_ADDITIONAL',
          },
        }
      })

      old = {
        source() {
          return source
        },
      }

      CommonsServerChunkPlugin = require('../../../src/webpack/CommonsServerChunkPlugin').default
    })
  })

  it('should update each page in the compilation', () => {
    new CommonsServerChunkPlugin().apply(compiler)
    compilationHook({
      hooks: {},
      chunks: [
        {
          files: ['pages/p/[productId].js', 'foo.js'],
        },
      ],
      updateAsset,
    })
    hook()
    expect(updateAsset).toHaveBeenCalledTimes(1)
    expect(filename).toBe('pages/p/[productId].js')
    expect(replaceFn(old).source()).toBe(
      '(function(modules){})({, ...require("../../webpack-runtime-commons.js").modules })'
    )
  })

  it('should preserve source maps', () => {
    new CommonsServerChunkPlugin().apply(compiler)
    compilationHook({
      hooks: {},
      chunks: [
        {
          files: ['pages/p/[productId].js', 'foo.js'],
        },
      ],
      updateAsset,
    })
    hook()
    source = source + ' //# sourceMappingURL=_page.js.map'

    expect(updateAsset).toHaveBeenCalledTimes(1)
    expect(filename).toBe('pages/p/[productId].js')
    expect(replaceFn(old).source()).toBe(
      '(function(modules){})({, ...require("../../webpack-runtime-commons.js").modules }) //# sourceMappingURL=_page.js.map'
    )
  })

  it('should accept a custom chunk name', () => {
    new CommonsServerChunkPlugin('vendor').apply(compiler)

    compilationHook({
      hooks: {},
      chunks: [
        {
          files: ['pages/p/[productId].js', 'foo.js'],
        },
      ],
      updateAsset,
    })
    hook()

    expect(replaceFn(old).source()).toBe(
      '(function(modules){})({, ...require("../../vendor.js").modules })'
    )
  })

  it("should use webpack 5's processAssets hook if available to avoid deprecation warnings", () => {
    new CommonsServerChunkPlugin('vendor').apply(compiler)

    compilationHook({
      hooks: {
        processAssets: {
          tap: (name, h) => {
            hook = h
          },
        },
      },
      chunks: [
        {
          files: ['pages/p/[productId].js', 'foo.js'],
        },
      ],
      updateAsset,
    })
    hook()

    expect(replaceFn(old).source()).toBe(
      '(function(modules){})({, ...require("../../vendor.js").modules })'
    )
  })
})
