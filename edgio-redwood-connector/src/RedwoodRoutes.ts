import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import RouteGroup from '@edgio/core/router/RouteGroup'
import loadRedwoodConfig from './utils/loadRedwoodConfig'
import { isProductionBuild } from '@edgio/core/environment'

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Adds all routes from your RedwoodJS app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { redwoodRoutes } from '@edgio/redwood'
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

    if (isProductionBuild()) {
      this.router.group(this.routeGroupName, group => this.addRoutesToGroup(group))
    } else {
      this.router.fallback(res => res.renderWithApp())
    }
  }

  private addRoutesToGroup(group: RouteGroup) {
    const redwoodConfig = loadRedwoodConfig()

    group.match(`${redwoodConfig.web.apiUrl}/:path*`, ({ renderWithApp }) => {
      renderWithApp()
    })

    group.match('/static/:path*', ({ cache, serveStatic }) => {
      cache({
        browser: false,
        edge: {
          maxAgeSeconds: ONE_YEAR,
        },
      })
      serveStatic('web/dist/static/:path*')
    })

    group.match('/', ({ cache, serveStatic }) => {
      cache({
        browser: false,
        edge: {
          maxAgeSeconds: ONE_YEAR,
        },
      })

      serveStatic('web/dist/index.html')
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
      serveStatic('web/dist/:path*.html', {
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
