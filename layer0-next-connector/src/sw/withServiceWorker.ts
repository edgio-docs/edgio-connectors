/* istanbul ignore file */
import { join } from 'path'
const withOffline = require('next-offline')
const { GenerateSW, InjectManifest } = require('workbox-webpack-plugin')

/**
 * A Next.js plugin that emits a service worker suitable for prefetching
 * assets from Layer0. This plugin also applies the `withLayer0` plugin.
 *
 * Example usage:
 *
 * ```js
 *  // next.config.js
 *
 *  import { withServiceWorker } from '@layer0/next/sw'
 *
 *  module.exports = withServiceWorker({
 *    webpack(config, options) {
 *      // your custom webpack config here
 *    }
 *  })
 * ```
 */
export default function withServiceWorker(_nextConfig: any) {
  const normalizedNextConfig =
    typeof _nextConfig === 'function' ? _nextConfig : () => _nextConfig || {}

  const plugin = (...args: any[]): any => {
    const { workboxOpts, ...config } = normalizedNextConfig(...args)

    return withOffline({
      generateInDevMode: true,
      generateSw: false,
      workboxOpts: {
        swSrc: join(process.cwd(), 'sw', 'service-worker.js'),
        swDest: join(process.cwd(), '.next', 'static', 'service-worker.js'),
        // The asset names for page chunks contain square brackets, eg [productId].js
        // Next internally injects these chunks encoded, eg %5BproductId%5D.js
        // For precaching to work the cache keys need to match the name of the assets
        // requested, therefore we need to transform the manifest entries with encoding.
        manifestTransforms: [
          (manifestEntries: any[]) => {
            console.log('> Creating service worker...')
            const manifest = manifestEntries
              .filter(
                entry => !entry.url.includes('next/dist') && !entry.url.includes('autostatic/')
              ) // these paths fail in development resulting in the service worker not being installed
              .map(entry => {
                entry.url = encodeURI(entry.url)
                return entry
              })
            return { manifest, warnings: [] }
          },
        ],
        ...workboxOpts,
      },
      ...config,
      webpack(webpackConfig: any, options: any) {
        let hasExistingWorkboxPlugins = false
        webpackConfig.plugins.forEach((plugin: any) => {
          if (plugin instanceof GenerateSW || plugin instanceof InjectManifest) {
            hasExistingWorkboxPlugins = true
          }
        })
        if (hasExistingWorkboxPlugins) {
          console.error(
            '> [layer0/next/config/withServiceWorker] Warning: Detected existing Workbox service worker configuration.'
          )
          console.error(
            '> This may result in build errors. It is recommended to either remove the existing configuration or the'
          )
          console.error('> `withServiceWorker` wrapper function from next.config.js config export.')
        }
        if (typeof config.webpack === 'function') {
          return config.webpack(webpackConfig, options)
        }

        return webpackConfig
      },
    })
  }

  if (typeof _nextConfig === 'function') {
    return plugin
  } else {
    return plugin()
  }
}
