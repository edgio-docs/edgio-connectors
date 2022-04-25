import { getServerBuildAvailability } from './util/getServerBuildAvailability'
import CommonsServerChunkPlugin from './webpack/CommonsServerChunkPlugin'

const determineTarget = ({
  useServerBuild,
  target,
}: {
  useServerBuild?: boolean
  target: string
}) => {
  return useServerBuild
    ? 'server'
    : target === 'serverless'
    ? 'serverless'
    : 'experimental-serverless-trace'
}

/**
 * Creates a Next.js config suitable for deployment on Layer0.
 *
 * Example usage:
 *
 * ```js
 *  // next.config.js
 *
 *  import withLayer0 from '@layer0/next/withLayer0'
 *
 *  module.exports = withLayer0({
 *    webpack(config, options) {
 *      // your custom webpack config here
 *    }
 *  })
 * ```
 *
 * @param config A next.js config
 * @return A next.js config
 */
export = function withLayer0(_nextConfig: any) {
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    const nextConfig = normalizedNextConfig(...args)
    const { useServerBuild } = getServerBuildAvailability({ config: nextConfig })

    return {
      ...nextConfig,
      target: determineTarget({ useServerBuild, target: nextConfig.target }),
      experimental: {
        ...nextConfig.experimental,
        ...(useServerBuild ? { outputStandalone: true } : {}),
      },
      withLayer0Applied: true, // validateNextConfig looks for this to ensure that the configuration is valid
      webpack: (config: any, options: any) => {
        const webpackConfig = { ...(nextConfig.webpack?.(config, options) || config) }

        if (options.webpack.version.startsWith('5')) {
          Object.assign(config, {
            resolve: {
              ...config.resolve,
              fallback: {
                ...config.resolve?.fallback,
                process: false,
              },
            },
          })
        }

        if (!options.isServer && !nextConfig.disableLayer0DevTools) {
          // Adding Devtools to client JS file
          if (isLayer0DevtoolsInstalled()) {
            const originalEntry = config.entry
            config.entry = async () => {
              const entries = await originalEntry()

              if (!entries['main.js'].includes('@layer0/devtools/widget/install')) {
                entries['main.js'].unshift('@layer0/devtools/widget/install')
              }

              return entries
            }
          }
        }

        if (options.isServer && process.env.NODE_ENV === 'production') {
          if (nextConfig.layer0SourceMaps) {
            // We force the 'source-map' value as this is what we expect to consume on
            // our lambda infrastructure
            config.devtool = 'source-map'
          }

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

        return Object.assign(webpackConfig, config)
      },
    }
  }

  if (typeof _nextConfig === 'function') {
    return plugin
  } else {
    return plugin()
  }
}

function isLayer0DevtoolsInstalled() {
  try {
    require('@layer0/devtools/widget/install')
    return true
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return false
    throw e
  }
}
