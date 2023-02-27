import Router from '@edgio/core/router/Router'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'
import { join } from 'path'
import { readAsset } from './assets'
import { VueConfig, VUE_CONFIG_NAME } from './VueConfig'

/**
 * Adds all routes from your Vue 3 app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { vueRoutes } from '@edgio/vue-cva'
 *
 * export default new Router().use(vue3Routes)
 * ```
 */
export default class VueRoutes extends PluginBase {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    const { outDir }: VueConfig = JSON.parse(
      readAsset(
        process.env.NODE_ENV === 'production'
          ? VUE_CONFIG_NAME
          : join('.edgio_temp', VUE_CONFIG_NAME)
      )
    )

    router.match('/service-worker.js', ({ serviceWorker }) =>
      serviceWorker(join(outDir, '/service-worker.js'))
    )
    if (isProductionBuild()) {
      router.static(outDir)
      router.fallback(({ appShell }) => appShell(join(outDir, '/index.html')))
    } else {
      /**
       * This fixes following issue:
       * When VITE is streaming css, it passes empty query param "lang.css" at the end of url, from which it detects what it needs to return.
       * Dev server's proxy transform this into an empty query arg (eg. ...&lang.css=), which means VITE parses it wrong, crashes gui - hence this hack.
       */
      router.match({ query: { ['lang.css']: '' } }, ({ request }) => {
        request.url += '=lang.css'
      })
      router.fallback(res => res.renderWithApp())
    }
  }
}
