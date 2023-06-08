import { join } from 'path'
import { JsonMap } from '@iarna/toml'
import { edgioRoutes } from '@edgio/core'
import loadRedwoodConfig from './utils/loadRedwoodConfig'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'

/**
 * Adds all routes from your RedwoodJS app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { redwoodRoutes } from '@edgio/redwood'
 *
 * export default new Router().use(redwoodRoutes)
 * ```
 */
export default class RedwoodRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered. Adds a route for static assets.
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      const redwoodConfig = loadRedwoodConfig()

      // Serve SPA as 404 not found page for all routes by default,
      router.match('/:path*', ({ serveStatic, setResponseCode }) => {
        serveStatic(join('web', 'dist', 'index.html'))
        setResponseCode(404)
      })

      // Serve generated pages and static assets
      router.static(join('web', 'dist'), {
        handler: ({ setResponseCode }) => setResponseCode(200),
      })

      const apiUrl = (redwoodConfig.web as JsonMap)?.apiUrl
      if (apiUrl) {
        // Add route for API if it exists
        router.match(
          `${(redwoodConfig.web as JsonMap)?.apiUrl}/:path*`,
          ({ renderWithApp, setResponseCode }) => {
            renderWithApp()
            setResponseCode(200)
          }
        )
      }
    } else {
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
    }
    router.use(edgioRoutes)
  }
}
