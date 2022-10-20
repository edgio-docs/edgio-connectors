import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import RouteGroup from '@edgio/core/router/RouteGroup'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * A TTL for assets that never changes. 10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

const FAR_FUTURE_CACHE_CONFIG = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

/**
 * Adds all routes from your Frontity app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { frontityRoutes } from '@edgio/frontity'
 *
 * export default new Router().use(frontityRoutes)
 * ```
 */
export default class FrontityRoutes extends PluginBase {
  private router?: Router
  private readonly routeGroupName = 'frontity_routes'

  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router

    if (isProductionBuild()) {
      this.router.group(this.routeGroupName, group => this.addRoutesToGroup(group))
    }

    this.router.fallback(res => res.renderWithApp())
  }

  private addRoutesToGroup(group: RouteGroup) {
    group
      .match('/service-worker.js', ({ serviceWorker }) => serviceWorker('build/service-worker.js'))
      .match('/static/:path*', ({ cache, serveStatic }) => {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic('build/static/:path*', { permanent: true })
      })
  }
}
