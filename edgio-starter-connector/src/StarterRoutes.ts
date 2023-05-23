import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { FAR_FUTURE_TTL } from '@edgio/core/constants'
import { edgioRoutes } from '@edgio/core'

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
export default class StarterRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    router.match('/service-worker.js', ({ serviceWorker }) => {
      serviceWorker('dist/service-worker.js')
    })

    router.match('/__edgio__/:version/browser.js', ({ cache, serveStatic }) => {
      serveStatic('dist/browser.js')
      cache({
        edge: {
          maxAgeSeconds: FAR_FUTURE_TTL,
        },
        browser: {
          maxAgeSeconds: FAR_FUTURE_TTL,
        },
      })
    })
    router.use(edgioRoutes)
  }
}
