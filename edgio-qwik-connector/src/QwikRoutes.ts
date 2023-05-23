import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

/**
 * Adds all routes from your Qwik app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { qwikRoutes } from '@edgio/qwik'
 *
 * export default new Router().use(qwikRoutes)
 * ```
 */

export default class QwikRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    router.match('/:path*', ({ renderWithApp }) => {
      renderWithApp()
    })
    if (isProductionBuild()) {
      router.static('dist')
    }
    router.use(edgioRoutes)
  }
}
