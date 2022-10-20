import PluginBase from '@edgio/core/plugins/PluginBase'
import Router from '@edgio/core/router/Router'

/**
 * A TTL for assets that never change.  10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

/**
 * An Edgio middleware that automatically adds the service worker and browser.js routes to your Edgio router.
 *
 * Example:
 *
 * ```js
 * import { starterRoutes } from '@edgio/starter'
 * import { Router } from '@edgio/core/router'
 *
 * export default new Router().use(starterRoutes)
 * ```
 */
export default class StarterRoutes extends PluginBase {
  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    router.group('starter_routes_group', group => {
      group.match('/service-worker.js', ({ serviceWorker }) => {
        serviceWorker('dist/service-worker.js')
      })

      group.match('/__edgio__/:version/browser.js', ({ cache, serveStatic }) => {
        cache({
          edge: {
            maxAgeSeconds: FAR_FUTURE_TTL,
          },
          browser: {
            maxAgeSeconds: FAR_FUTURE_TTL,
          },
        })
        serveStatic('dist/browser.js')
      })
    })
  }
}
