import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { getBuildPath, getOutputPath } from '../utils/getBuildPath'

export default class AngularRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered
   * @private
   * @param router
   */
  onRegister(router: Router) {
    if (isProductionBuild()) {
      const buildPath = getBuildPath()

      // Determine SSR if server output path exists in angular.json
      const isSsr = !!getOutputPath('server')

      if (isSsr) {
        // Rest of the requests go to SSR
        router.match('/:path*', ({ renderWithApp }) => {
          renderWithApp()
        })
      } else {
        // If not SSR, serve SPA fallback
        router.match('/:path*', ({ appShell }) => {
          appShell(`${buildPath}/index.html`)
        })
      }

      // Cache the buildPath directory by default
      router.static(buildPath)
    } else {
      // All requests go to SSR
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
    }
    router.use(edgioRoutes)
  }
}
