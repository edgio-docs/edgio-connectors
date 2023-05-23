import { edgioRoutes } from '@edgio/core'
import getAstroConfig from './getAstroConfig'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

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

export default class AstroRoutes implements RouterPlugin {
  private router?: Router

  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  async onRegister(router: Router) {
    this.router = router
    this.addFallback()
    if (isProductionBuild()) {
      this.addStaticAssets()
    }
    router.use(edgioRoutes)
  }

  /**
   * Adds rule for static assets
   */
  async addStaticAssets() {
    const { outDir, output } = await getAstroConfig()
    const server = output === 'server'

    // If the output is static
    // Serve assets from the static directory
    // If the output is server (Astro SSR)
    // Create serve static routes for the all the assets under dist/client folder
    this.router?.static(server ? `${outDir}/client` : outDir)
  }

  /**
   * Forwards all unmatched requests to the Astro app for processing.
   */
  addFallback(mode: boolean = true, dist?: string) {
    if (mode) {
      this.router?.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
      return
    }
    this.router?.match('/:path*', ({ serveStatic, send }) => {
      serveStatic(`${dist}/404.html`)
    })
  }
}
