import CommonsServerChunkPlugin from './webpack/CommonsServerChunkPlugin'
import { IgnorePlugin } from 'webpack'

/**
 * Creates a Next.js config suitable for deployment on the Moovweb XDN.
 *
 * Example usage:
 *
 * ```js
 *  // next.config.js
 *
 *  import withXDN from '@xdn/next/withXDN'
 *
 *  module.exports = withXDN({
 *    webpack(config, options) {
 *      // your custom webpack config here
 *    }
 *  })
 * ```
 *
 * @param config A next.js config
 * @return A next.js config
 */
export = function withXDN({ webpack, ...config }: any = {}) {
  return {
    ...config,
    target: 'serverless',
    withXDNApplied: true, // validateNextConfig looks for this to ensure that the configuration is valid
    webpack(config: any, options: any) {
      if (options.webpack.version.startsWith('5')) {
        // fix the error about not being able to resolve module 'encoding' from node-fetch when using webpack 5 and next-offline
        config.plugins?.push(
          new IgnorePlugin({
            resourceRegExp: /^encoding$/,
          })
        )
      }

      if (!options.isServer) {
        // Adding Devtools to client JS file
        if (isXdnDevtoolsInstalled()) {
          const originalEntry = config.entry
          config.entry = async () => {
            const entries = await originalEntry()

            if (!entries['main.js'].includes('@xdn/devtools/widget/install')) {
              entries['main.js'].unshift('@xdn/devtools/widget/install')
            }

            return entries
          }
        }
      }

      if (options.isServer && process.env.NODE_ENV === 'production') {
        config.output.chunkFilename = '[name].js'

        config.optimization.splitChunks = {
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              // Note that the name of the chunk is very important.  If the name doesn't include "webpack-runtime",
              // Next.js's PagesManifestPlugin will fail to include each page in the server build's pages-manifest.json
              // and the build will fail with an error like "module not found for page /".
              // See this line in PagesManifestPlugin:
              // https://github.com/vercel/next.js/blob/210a6980d2d630e0ed7c67552a6ebf96921dac15/packages/next/build/webpack/plugins/pages-manifest-plugin.ts#L38
              name: 'webpack-runtime-commons',
              reuseExistingChunk: true,
              minChunks: 1,
              chunks: 'all',
              test: /node_modules/,
            },
          },
        }

        config.plugins.push(new CommonsServerChunkPlugin())
      }

      if (typeof webpack === 'function') {
        return webpack(config, options)
      } else {
        return config
      }
    },
  }
}

function isXdnDevtoolsInstalled() {
  try {
    require('@xdn/devtools/widget/install')
    return true
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return false
    throw e
  }
}
