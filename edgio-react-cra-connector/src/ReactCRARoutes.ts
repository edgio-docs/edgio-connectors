import { join } from 'path'
import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

/**
 * Adds all routes from your React CRA app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { reactCRARoutes } from '@edgio/react-cra'
 *
 * export default new Router().use(reactCRARoutes)
 * ```
 */
export default class ReactCRARoutes implements RouterPlugin {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      router.match('/:path*', ({ serveStatic }) => {
        serveStatic(join('build', 'index.html'))
      })
      router.static('build', { ignore: 'service-worker.js' })
    } else {
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
    }
    router.match('/service-worker.js', ({ serviceWorker, setResponseHeader }) => {
      setResponseHeader('content-type', 'text/javascript')
      serviceWorker(join('.edgio', 'temp', 'service-worker.js'))
    })
    router.use(edgioRoutes)
  }
}
