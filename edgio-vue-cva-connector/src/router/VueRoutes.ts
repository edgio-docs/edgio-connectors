import { edgioRoutes } from '@edgio/core'
import { isProductionBuild } from '@edgio/core/environment'
import Router, { RouterPlugin } from '@edgio/core/router/Router'
import { SERIALIZED_CONFIG_FILE } from '../types'
import { join } from 'path'
import { readFileSync } from 'fs'

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
export default class VueRoutes implements RouterPlugin {
  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  async onRegister(router: Router) {
    if (isProductionBuild()) {
      // Load previously serialized config with outputDir
      const serializedConfig = JSON.parse(
        readFileSync(join(process.cwd(), '.edgio', SERIALIZED_CONFIG_FILE)).toString()
      )
      const outputDir = serializedConfig.outputDir

      // Render index.html for all paths by default
      router.match('/:path*', ({ serveStatic }) => {
        serveStatic(`${outputDir}/index.html`)
      })

      router.static(outputDir)
    } else {
      router.match('/:path*', ({ renderWithApp }) => {
        renderWithApp()
      })
    }
    router.match('/service-worker.js', ({ serviceWorker }) => {
      // We don't provide a path here because the build and dev process puts it in the correct path (s3/service-worker.js)
      serviceWorker()
    })
    router.use(edgioRoutes)
  }
}
