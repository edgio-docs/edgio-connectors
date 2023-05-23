import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

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
export default class FrontityRoutes implements RouterPlugin {
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
      // We don't provide a path here because the build and dev process puts it in the correct path (s3/service-worker.js)
      serviceWorker()
    })
    if (isProductionBuild()) {
      router.static('build', { ignore: ['server.js', 'service-worker.js'] })
    }
    router.use(edgioRoutes)
  }
}
