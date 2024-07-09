import { join } from 'path'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { getBuildPath, getOutputPath } from './utils'

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
        if (router.Config.proxyToServerlessByDefault !== false) {
          // Rest of the requests go to SSR
          router.match('/:path*', ({ renderWithApp }) => {
            renderWithApp()
          })
        }
      } else {
        // If not SSR, serve SPA fallback
        router.match('/:path*', ({ serveStatic }) => {
          serveStatic(join(buildPath, 'index.html'))
        })
      }
      // Cache the buildPath directory by default
      router.static(buildPath)
    } else {
      if (router.Config.proxyToServerlessByDefault !== false) {
        // All requests go to SSR
        router.match('/:path*', ({ renderWithApp }) => {
          renderWithApp()
        })
      }
    }
  }
}
