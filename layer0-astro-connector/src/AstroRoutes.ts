import Router from '@layer0/core/router/Router'
import PluginBase from '@layer0/core/plugins/PluginBase'
import RouteGroup from '@layer0/core/router/RouteGroup'
import { isProductionBuild } from '@layer0/core/environment'

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Adds all routes from your Astro app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { astroRoutes } from '@layer0/astro'
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
      this.router.group(this.routeGroupName, group => this.addRoutesToGroup(group))
    } else {
      this.router.fallback(res => res.renderWithApp())
    }
  }

  private addRoutesToGroup(group: RouteGroup) {
    group
      .match(
        '/:path*/:file.:ext(js|mjs|css|png|ico|svg|jpg|jpeg|gif|ttf|woff|otf)',
        ({ cache, serveStatic }) => {
          cache({
            edge: {
              maxAgeSeconds: ONE_YEAR,
            },
          })
          serveStatic('dist/:path*/:file.:ext')
        }
      )
      .match('/:path*', ({ cache, serveStatic, setResponseHeader }) => {
        cache({
          browser: false,
          edge: {
            maxAgeSeconds: ONE_YEAR,
          },
        })
        serveStatic('dist/:path*', {
          onNotFound: async () => serveStatic('dist/404.html'),
        })
      })
  }
}
