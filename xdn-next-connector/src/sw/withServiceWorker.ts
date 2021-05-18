/* istanbul ignore file */
import { join } from 'path'
const withOffline = require('next-offline')

/**
 * A Next.js plugin that emits a service worker suitable for prefetching
 * assets from the XDN. This plugin also applies the `withXDN` plugin.
 *
 * Example usage:
 *
 * ```js
 *  // next.config.js
 *
 *  import { withServiceWorker } from '@xdn/next/sw'
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
    })
  }

  if (typeof _nextConfig === 'function') {
    return plugin
  } else {
    return plugin()
  }
}
