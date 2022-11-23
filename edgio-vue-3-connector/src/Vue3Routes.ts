import getViteConfig from './getViteConfig'
import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

/**
 * Adds all routes from your Vue 3 app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { vue3Routes } from '@edgio/vue-3'
 *
 * export default new Router().use(vue3Routes)
 * ```
 */
export default class Vue3Routes extends PluginBase {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    const viteConfig = getViteConfig()
    const outDir = viteConfig.outDir

    if (isProductionBuild()) {
      router.static(outDir)
      router.fallback(({ appShell }) => {
        appShell(`${outDir}/index.html`)
      })
    } else {
      router.fallback(res => res.renderWithApp())
    }
  }
}
