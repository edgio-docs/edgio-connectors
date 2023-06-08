import { join } from 'path'
import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

/**
 * Adds all routes from your Razzle app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { razzleRoutes } from '@edgio/razzle'
 *
 * export default new Router().use(razzleRoutes)
 * ```
 */
export default class RazzleRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    router.match('/:path*', ({ renderWithApp }) => {
      renderWithApp()
    })
    router.match('/service-worker.js', ({ serviceWorker }) => {
      serviceWorker(join('.edgio', 's3', 'service-worker.js'))
    })
    if (isProductionBuild()) {
      router.static(join('build', 'public'))
    }
    router.use(edgioRoutes)
  }
}
