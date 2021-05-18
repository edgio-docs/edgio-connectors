import Router from '@xdn/core/router/Router'
import PluginBase from '@xdn/core/plugins/PluginBase'
import RouteGroup from '@xdn/core/router/RouteGroup'
import { isProductionBuild } from '@xdn/core/environment'

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
 * Adds all routes from your Fastboot app to the XDN router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@xdn/core/router'
 * import { fastbootRoutes } from '@xdn/fastboot'
 *
 * export default new Router().use(fastbootRoutes)
 * ```
 */
export default class FastbootRoutes extends PluginBase {
  private router?: Router
  private readonly routeGroupName = 'fastboot_routes'

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
      .match('/service-worker.js', ({ serviceWorker }) => serviceWorker('dist/service-worker.js'))
      .match('/assets/:path*', ({ cache, serveStatic }) => {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic('dist/assets/:path*', { permanent: true })
      })
  }
}
