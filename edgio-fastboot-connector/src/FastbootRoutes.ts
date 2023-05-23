import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { edgioRoutes } from '@edgio/core'

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
export default class FastbootRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    router.match('/(.*)', ({ renderWithApp }) => {
      renderWithApp()
    })
    router.match('/service-worker.js', ({ serviceWorker }) => {
      // We don't provide a path here because the build and dev process puts it in the correct path (s3/service-worker.js)
      serviceWorker()
    })
    router.use(edgioRoutes)
  }
}
