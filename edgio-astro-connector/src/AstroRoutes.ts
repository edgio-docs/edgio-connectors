import { existsSync } from 'fs'
import { notFoundPageHTML } from './404'
import getAstroConfig from './getAstroConfig'
import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * Adds all routes from your Astro app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { astroRoutes } from '@edgio/astro'
 *
 * export default new Router().use(astroRoutes)
 * ```
 */

export default class AstroRoutes extends PluginBase {
  private router?: Router
  private readonly routeGroupName = 'astro_routes'

  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    if (isProductionBuild()) {
      router.group(this.routeGroupName, () => this.addRoutesToGroup())
    } else {
      if (existsSync('.edgio/temp/service-worker.js')) {
        router.match('/service-worker.js', ({ serviceWorker }) => {
          serviceWorker('.edgio/temp/service-worker.js')
        })
      }
      this.addFallback()
    }
  }

  /**
   * Forwards all unmatched requests to the Astro app for processing.
   */
  addFallback(mode: boolean = true, dist?: string) {
    if (mode) {
      this.router?.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    } else {
      this.router?.fallback(({ serveStatic, send }) => {
        serveStatic(`${dist}/404.html`, {
          onNotFound: async () => {
            send(notFoundPageHTML, 404, 'Not Found')
          },
        })
      })
    }
  }

  private addRoutesToGroup() {
    const { outDir, output, edgio_SW } = getAstroConfig()
    const server = output === 'server'

    // If the service worker is present in the config as true
    // bundle the service worker from the expected path
    if (edgio_SW) {
      this.router?.match('/service-worker.js', ({ serviceWorker }) => {
        serviceWorker('.edgio/temp/service-worker.js')
      })
    }

    // If the output is static
    // Serve assets from the static directory
    // If the output is server (Astro SSR)
    // Create serve static routes for the all the assets under dist/client folder
    this.router?.static(server ? `${outDir}/client` : outDir)

    // All other paths that are not part of the outDir directory
    this.addFallback(server, outDir)
  }
}
