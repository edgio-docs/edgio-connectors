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

    connector.withServerless &&
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })

    if (isProductionBuild()) {
      const staticFolder =
        typeof connector.staticFolder === 'function'
          ? connector.staticFolder(config)
          : connector.staticFolder
      staticFolder && router.static(staticFolder)
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
