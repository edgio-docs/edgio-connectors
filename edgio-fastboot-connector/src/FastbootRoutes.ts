import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * Adds all routes from your Fastboot app to the Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { fastbootRoutes } from '@edgio/fastboot'
 *
 * export default new Router().use(fastbootRoutes)
 * ```
 */
export default class FastbootRoutes extends PluginBase {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      router.match('/service-worker.js', ({ serviceWorker }) =>
        serviceWorker('dist/service-worker.js')
      )
      router.static('dist')
    }
    router.fallback(({ renderWithApp }) => {
      renderWithApp()
    })
  }
}
