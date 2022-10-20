import { InjectManifest } from 'workbox-webpack-plugin'
import { resolve, join } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const NUXT_DIR = join(process.cwd(), '.nuxt', 'dist')
const OUTPUT_DIR = join(NUXT_DIR, 'client')

/**
 * This can be added to a nuxt.config.js configuration as a build plugin, to
 * allow a service worker to have the manifest injected when building for Edgio.
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
      swDest: 'service-worker.js',
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

  async handleEmit(compilation: any) {
    //@ts-ignore
    await super.handleEmit(compilation)

    if (process.env.NODE_ENV !== 'production') {
      this.writeFile(compilation)
    }
  }

  /**
   * Writes the service worker to disk in dev mode. Since Nuxt uses an in-memory fs in dev
   * mode, the only way the user can test the service worker is if we explictly write it to disk
   * so it can be served from Edgio.
   * @param compilation
   */
  private writeFile(compilation: any) {
    if (!existsSync(NUXT_DIR)) {
      mkdirSync(NUXT_DIR)
    }
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR)
    }
    writeFileSync(
      join(OUTPUT_DIR, 'service-worker.js'),
      compilation.assets['service-worker.js'].source(),
      'utf8'
    )
  }
}
