import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

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
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      router.match('/service-worker.js', ({ serviceWorker }) =>
        serviceWorker('build/service-worker.js')
      )
      router.static('build', { ignore: ['server.js'] })
    }
    router.fallback(({ renderWithApp }) => {
      renderWithApp()
    })
  }
}
