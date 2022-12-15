import Router from '@edgio/core/router/Router'
import { getSanityConfig } from './getSanityConfig'
import RouteGroup from '@edgio/core/router/RouteGroup'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * Adds all routes from your Sanity Studio app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { sanityRoutes } from '@edgio/sanity-studio'
 *
 * export default new Router().use(sanityRoutes)
 * ```
 */

export default class SanityRoutes extends PluginBase {
  private readonly sanityRouteGroupName = 'sanity_routes_group'
  private router?: Router
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    this.router.group(this.sanityRouteGroupName, group => this.addRoutesToGroup(group))
  }

  private addRoutesToGroup(group: RouteGroup) {
    // Leveraging Edgio Router in both build and dev mode as `sanity start` fails to adjust according to the basePath inside sanity.json
    const sanityConfig = getSanityConfig()
    if (isProductionBuild()) {
      // If basePath inside sanity.json exists, serve the build on the basePath
      if (sanityConfig?.project?.basePath) {
        const basePath = sanityConfig.project.basePath
        // Explicitly serve index.html on the desk route to avoid /desk#skd from returning 404
        group.match(`${basePath}/desk`, ({ serveStatic }) => {
          serveStatic('dist/index.html')
        })
        // Serve all the assets under basePath route
        // Fallback to the index.html for the non-matching routes
        group.match(`${basePath}/:path*`, ({ serveStatic }) => {
          serveStatic('dist/:path*', {
            onNotFound: async () => await serveStatic('dist/index.html'),
          })
        })
      } else {
        // If no basePath is found, serve the dist directory as static and fallback to index.html
        group.static('dist', {})
        this.router?.fallback(({ appShell }) => {
          appShell('dist/index.html')
        })
      }
    } else {
      this.router?.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    }
  }
}
