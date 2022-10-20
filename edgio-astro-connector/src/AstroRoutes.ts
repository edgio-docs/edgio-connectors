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
      this.router.group(this.routeGroupName, () => this.addRoutesToGroup())
    } else {
      this.addFallback()
    }
  }

  /**
   * Forwards all unmatched requests to the Astro app for processing.
   */
  addFallback(mode: boolean = true, dist?: string) {
    if (mode) {
      this.router?.fallback(res => res.renderWithApp())
    } else {
      this.router?.fallback(res => res.serveStatic(`${dist}/404.html`))
    }
  }

  private async addRoutesToGroup() {
    const { outDir, output } = await getAstroConfig()
    const server = output === 'server'

    // If the output is static
    // Serve assets from the static directory
    // If the output is server (Astro SSR)
    // Create serve static routes for the all the assets under dist/client folder
    this.router?.static(server ? `${outDir}/client` : outDir)

    // All other paths that are not part of the outDir directory
    this.addFallback(server, outDir)
  }
}
