import { Router, edgioRoutes } from '@edgio/core/router'
import { getConfig } from '@edgio/core/config'
import { isProductionBuild } from '@edgio/core/environment'

export class CustomRoutes extends Router {
  onRegister(router: Router) {
    const edgioConfig = getConfig()

    router.match('/:path*', ({ renderWithApp }) => {
      renderWithApp()
    })
    router.match('/service-worker.js', ({ serviceWorker }) => {
      // We don't provide a path here because the build and dev process puts it in the correct path (s3/service-worker.js)
      serviceWorker()
    })

    if (edgioConfig.customConnector?.buildFolder && isProductionBuild()) {
      router.static(edgioConfig.customConnector?.buildFolder)
    }

    router.use(edgioRoutes)
  }
}
