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

      if (isSsr) {
        router.fallback(({ renderWithApp }) => {
          renderWithApp()
        })
      } else {
        router.static(buildPath)
      }
    } else {
      router.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    }
  }
}
