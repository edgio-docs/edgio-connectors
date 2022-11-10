import { BACKENDS } from '@edgio/core'
import { notFoundPageHTML } from '../404'
import { Router } from '@edgio/core/router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

export default class GatsbyRoutes extends PluginBase {
  /**
   * Called when plugin is registered
   * @param {Router} router
   */

  onRegister(router: Router) {
    if (isProductionBuild()) {
      router.static('public')
      router.fallback(res =>
        res.serveStatic(`public/404.html`, {
          onNotFound: async () => {
            res.send(notFoundPageHTML, 404, 'Not Found')
          },
        })
      )
    } else {
      router.match('/__webpack_hmr', ({ stream }) => stream(BACKENDS.js))
      router.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    }
  }
}
