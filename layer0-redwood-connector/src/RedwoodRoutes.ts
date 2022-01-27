import Router from '@layer0/core/router/Router'
import PluginBase from '@layer0/core/plugins/PluginBase'
import RouteGroup from '@layer0/core/router/RouteGroup'
import loadRedwoodConfig from './utils/loadRedwoodConfig'

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Adds all routes from your RedwoodJS app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { redwoodRoutes } from '@layer0/redwood'
 *
 * export default new Router().use(redwoodRoutes)
 * ```
 */
export default class RedwoodRoutes extends PluginBase {
  private router?: Router
  private readonly routeGroupName = 'redwood_routes'

  /**
   * Called when plugin is registered. Adds a route for static assets.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router

    this.router.group(this.routeGroupName, group => this.addRoutesToGroup(group))
  }

  private addRoutesToGroup(group: RouteGroup) {
    const redwoodConfig = loadRedwoodConfig()

    group.match(`${redwoodConfig.web.apiUrl}/:path*`, ({ renderWithApp }) => {
      renderWithApp()
    })

    group.match('/:path*', ({ cache, serveStatic }) => {
      cache({
        browser: false,
        edge: {
          maxAgeSeconds: ONE_YEAR,
        },
      })

      // Attempt to serve the requested path
      // If not found, serve web/dist/200.html which will exist if routes are prerendered
      // If not found, fallback to web/dist/index.html
      serveStatic('web/dist/:path*', {
        onNotFound: async () => {
          await serveStatic('web/dist/200.html', {
            onNotFound: async () => {
              await serveStatic('web/dist/index.html')
            },
          })
        },
      })
    })
  }
}
