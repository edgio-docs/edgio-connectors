import { BACKENDS } from '@edgio/core'
import { Router } from '@edgio/core/router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

export default class GatsbyRoutes extends PluginBase {
  private router?: Router

  /**
   * Called when plugin is registered
   * @param {Router} router
   */

  onRegister(router: Router) {
    this.router = router
    if (isProductionBuild()) {
      this.router.static('public')
    } else {
      this.router.match('/__webpack_hmr', ({ stream }) => stream(BACKENDS.js))
      this.router.fallback(res => res.renderWithApp())
    }
  }
}
