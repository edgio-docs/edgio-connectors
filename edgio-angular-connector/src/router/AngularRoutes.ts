import { Router } from '@edgio/core/router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'
import { getBuildPath, getOutputPath } from '../utils/getBuildPath'

export default class AngularRoutes extends PluginBase {
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

      // Cache the buildPath directory by default
      router.static(buildPath)

      if (isSsr) {
        // Rest of the requests go to SSR
        router.fallback(({ renderWithApp }) => {
          renderWithApp()
        })
      } else {
        // If not SSR, serve SPA fallback
        router.fallback(({ appShell }) => {
          appShell(`${buildPath}/index.html`)
        })
      }
    } else {
      router.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    }
  }
}
