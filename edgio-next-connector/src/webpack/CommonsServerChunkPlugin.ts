import { RawSource } from 'webpack-sources'
import { relative, dirname } from 'path'
import slash from 'slash'

/**
 * This plugin injects the modules from a commons chunk into each module in pages during
 * the server build. This is needed to keep serverless builds small enough to fit in lambda.
 *
 * Example usage:
 *
 * ```js
 *  if (options.isServer) {
 *    config.output.chunkFilename = '[name].js'
 *    config.plugins.push(new CommonsServerChunkPlugin('commons'))
 *    config.optimization.splitChunks = {
 *      cacheGroups: {
 *        default: false,
 *        vendors: false,
 *        commons: {
 *          name: 'commons',
 *          reuseExistingChunk: true,
 *          minChunks: 1,
 *          chunks: 'all',
 *          test: /node_modules/
 *        },
 *      },
 *    }
 *  }
 * ```
 */
export default class CommonsServerChunkPlugin {
  private chunkName: string

  constructor(chunkName: string = 'webpack-runtime-commons') {
    this.chunkName = chunkName
  }

  apply(compiler: any) {
    const name = 'CommonsServerChunkPlugin'

    compiler.hooks.compilation.tap(name, (compilation: any) => {
      const injectCommonsChunk = this.injectCommonsChunk.bind(this, compilation)

      if (compilation.hooks.processAssets) {
        // webpack 5
        console.log('> Optimizing serverless functions (Webpack 5)')
        const stage = compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        compilation.hooks.processAssets.tap({ name, stage }, injectCommonsChunk)
      } else {
        // webpack 4
        console.log('> Optimizing serverless functions (Webpack 4)')
        compiler.hooks.emit.tap(name, injectCommonsChunk)
      }
    })
  }

  injectCommonsChunk(compilation: any) {
    compilation.chunks.forEach((chunk: any) => {
      // Explore each asset filename generated by the chunk:
      chunk.files.forEach((filename: string) => {
        if (filename.startsWith('pages/')) {
          // webpack always uses forward slash here, even on windows
          compilation.updateAsset(filename, (old: any) => {
            const commonsPath = slash(relative(dirname(filename), `${this.chunkName}.js`)) // to make it work on windows

            return new RawSource(
              /*
            The chunks we are altering roughly take the following shape:
            ============================================================
            (function(modules) {
              // entry contents
            })({
              'moduleA': {
                // dependency 1 contents
              },
              'moduleB': {
                // dependency 2 contents
              }
              <== We need to inject the modules in the commons chunk here
            });
            */
              old.source().replace(
                /}\);(\s*\/\/# sourceMappingURL=.*)?\s*$/, // we include an optional group for source maps here (//# sourceMappingURL) in case the project uses @zeit/next-source-maps
                `, ...require("${commonsPath}").modules })$1`
              )
            )
          })
        }
      })
    })
  }
}
