import getNextVersion from '../util/getNextVersion'
import { getServerBuildAvailability } from '../util/getServerBuildAvailability'
import isTargetSupported from '../util/isTargetSupported'
import CommonsServerChunkPlugin from '../webpack/CommonsServerChunkPlugin'
import { getConfig } from '@edgio/core'
import { ExtendedConfig } from '../types'

const determineTarget = ({
  useServerBuild,
  target,
}: {
  useServerBuild?: boolean
  target: string
}) => {
  /* istanbul ignore next */
  if (useServerBuild) return 'server'
  return target === 'serverless' ? 'serverless' : 'experimental-serverless-trace'
}

/**
 * A Next.js plugin that adds Edgio specific configuration to a Next.js config.
 * This plugin sets:
 * - target based on used next version
 * - default output directory
 * - CommonsServerChunkPlugin for serverless target
 * - imageOptimizer allowed domains
 * @param _nextConfig A next.js config
 * @return A next.js config
 */
export function withEdgioConfig(_nextConfig: any) {
  const edgioConfig = getConfig() as ExtendedConfig
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    const nextConfig = normalizedNextConfig(...args)
    const { useServerBuild, standaloneBuildConfig } = getServerBuildAvailability({
      config: nextConfig,
      quiet: true,
    })

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

        if (
          options.isServer &&
          (options.nextRuntime == null || options.nextRuntime === 'nodejs') && // make sure we aren't building middelware (options.nextRuntime === 'edge') or this will break
          process.env.NODE_ENV === 'production'
        ) {
          if (edgioConfig?.next?.generateSourceMaps) {
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

    return result
  }
  return typeof _nextConfig === 'function' ? plugin : plugin()
}
