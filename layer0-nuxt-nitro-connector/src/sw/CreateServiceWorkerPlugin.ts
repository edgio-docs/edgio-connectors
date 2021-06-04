import { InjectManifest } from 'workbox-webpack-plugin'
import { resolve } from 'path'

/**
 * This can be added to a nuxt.config.js configuration as a build plugin, to
 * allow a service worker to have the manifest injected when building for Layer0.
 *
 * Example nuxt.config.js:
 *
 * ```js
 *  build: {
 *    extend(config, { isClient }) {
 *      if (isClient) {
 *        config.plugins.push(new CreateServiceWorkerPlugin())
 *      }
 *    },
 *  }
 * ```
 */
export default class CreateServiceWorkerPlugin extends InjectManifest {
  constructor(config: any = {}) {
    super({
      ...config,
      swSrc: resolve(process.cwd(), 'sw', 'service-worker.js'),
      swDest: '../service-worker.js',
      exclude: [/\/server\/.*/],
      manifestTransforms: [
        (manifestEntries: any[]) => {
          console.log('> Creating service worker...')
          const manifest = manifestEntries.filter(entry => entry.url !== '/_nuxt/LICENSES')
          return { manifest, warnings: [] }
        },
      ],
    })
  }
}
