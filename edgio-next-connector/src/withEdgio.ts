import getNextVersion from './util/getNextVersion'
import { getServerBuildAvailability } from './util/getServerBuildAvailability'
import isTargetSupported from './util/isTargetSupported'
import CommonsServerChunkPlugin from './webpack/CommonsServerChunkPlugin'

const determineTarget = ({
  useServerBuild,
  target,
}: {
  useServerBuild?: boolean
  target: string
}) => {
  /* istanbul ignore next */
  return useServerBuild
    ? 'server'
    : target === 'serverless'
    ? 'serverless'
    : 'experimental-serverless-trace'
}

/**
 * Creates a Next.js config suitable for deployment on Edgio.
 *
 * Example usage:
 *
 * ```js
 *  // next.config.js
 *
 *  import withEdgio from '@edgio/next/withEdgio'
 *
 *  module.exports = withEdgio({
 *    webpack(config, options) {
 *      // your custom webpack config here
 *    }
 *  })
 * ```
 *
 * @param config A next.js config
 * @return A next.js config
 */
export = function withEdgio(_nextConfig: any) {
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    const nextConfig = normalizedNextConfig(...args)

    const { useServerBuild, standaloneBuildConfig } = getServerBuildAvailability({
      config: nextConfig,
      quiet: true,
    })

    // validateNextConfig looks for this to ensure that the configuration is valid

    process.env.WITH_EDGIO_APPLIED = 'true'
    process.env.EDGIO_SOURCE_MAPS = nextConfig.edgioSourceMaps === false ? 'false' : 'true'

    const result: any = {
      ...nextConfig,
      ...standaloneBuildConfig,
      experimental: {
        ...nextConfig.experimental,
        ...standaloneBuildConfig.experimental,
      },
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

        if (!options.isServer && !nextConfig.disableEdgioDevTools) {
          // Adding Devtools to client JS file
          if (isEdgioDevtoolsInstalled()) {
            const originalEntry = config.entry
            config.entry = async () => {
              const entries = await originalEntry()

              if (!entries['main.js'].includes('@edgio/devtools/widget/install')) {
                entries['main.js'].unshift('@edgio/devtools/widget/install')
              }

              return entries
            }
          }
        }

        if (
          options.isServer &&
          (options.nextRuntime == null || options.nextRuntime === 'nodejs') && // make sure we aren't building middelware (options.nextRuntime === 'edge') or this will break
          process.env.NODE_ENV === 'production'
        ) {
          if (nextConfig.edgioSourceMaps) {
            // We force the 'source-map' value as this is what we expect to consume on
            // our lambda infrastructure
            config.devtool = 'source-map'
          }

          if (!useServerBuild) {
            config.plugins.push(new CommonsServerChunkPlugin())
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
          }
        }

        return Object.assign(webpackConfig, config)
      },
    }

    if (isTargetSupported(getNextVersion())) {
      result.target = determineTarget({ useServerBuild, target: nextConfig.target })
    }

    // Clean up expanded properties to suppress Next warnings in 12.2+
    delete result.edgioSourceMaps
    delete result.disableEdgioDevTools

    return result
  }

  if (typeof _nextConfig === 'function') {
    return plugin
  } else {
    return plugin()
  }
}

function isEdgioDevtoolsInstalled() {
  try {
    require('@edgio/devtools/widget/install')
    return true
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return false
    throw e
  }
}
