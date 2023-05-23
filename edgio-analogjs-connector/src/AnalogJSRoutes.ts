import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

/**
 * Adds all routes from your AnalogJS app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { analogjsRoutes } from '@edgio/analogjs'
 *
 * export default new Router().use(analogjsRoutes)
 * ```
 */
export default class AnalogJSRoutes implements RouterPlugin {
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
      router.static('dist/analog/public')
    }
    router.use(edgioRoutes)
  }
}
