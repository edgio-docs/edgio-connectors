import { edgioRoutes, getConfig } from '@edgio/core'
import ConnectorFactory from './ConnectorFactory'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * An Edgio middleware that automatically adds the service worker and browser.js routes to your Edgio router.
 *
 * Example:
 *
 * ```js
 * import { starterRoutes } from '@edgio/starter'
 * import { Router } from '@edgio/core/router'
 *
 * export default new Router().use(edgioRoutes)
 * ```
 */
export default class ConnectorRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    const config = getConfig()
    const connector = ConnectorFactory.get()

    const withServerless =
      typeof connector.withServerless === 'function'
        ? connector.withServerless(config)
        : connector.withServerless

    if (withServerless && router.Config.proxyToServerlessByDefault !== false) {
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
    }

    if (isProductionBuild()) {
      const staticFolder =
        typeof connector.staticFolder === 'function'
          ? connector.staticFolder(config)
          : connector.staticFolder

      const static404Error =
        typeof connector.static404Error === 'function'
          ? connector.static404Error(config)
          : connector.static404Error

      // Add static 404 error,
      // it needs to be before static folder
      if (static404Error) {
        router.match('/:path*', ({ serveStatic }) => {
          serveStatic(
            `${staticFolder ? `${staticFolder}/` : ''}${static404Error}`.replace(/\/+/g, '/')
          )
        })
      }

      // Add static folder assets
      if (staticFolder) {
        router.static(staticFolder)
      }
    }

    connector.onRegister?.(router)

    connector.withServiceWorker &&
      router.match('/service-worker.js', ({ serviceWorker }) => {
        // We don't provide a path here because the build and dev process puts it in the correct path (s3/service-worker.js)
        serviceWorker()
      })

    router.use(edgioRoutes)
  }
}
