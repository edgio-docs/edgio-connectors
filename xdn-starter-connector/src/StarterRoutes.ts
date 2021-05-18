import PluginBase from '@xdn/core/plugins/PluginBase'
import Router from '@xdn/core/router/Router'

/**
 * A TTL for assets that never change.  10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

/**
 * An XDN middleware that automatically adds the service worker and browser.js routes to your XDN router.
 *
 * Example:
 *
 * ```js
 * import { starterRoutes } from '@xdn/starter'
 * import { Router } from '@xdn/core/router'
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

      group.match('/__xdn__/:version/browser.js', ({ cache, serveStatic }) => {
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
