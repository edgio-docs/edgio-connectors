// This file was automatically added by layer0 deploy.
// You should commit this file to source control.
import { Router } from '@layer0/core/router'
import { fastbootRoutes } from '@layer0/fastboot'

export default new Router()
  .get('/', ({ cache }) => {
    cache({
      edge: {
        maxAgeSeconds: 60 * 60 * 24 * 365,
        staleWhileRevalidateSeconds: 60 * 60 * 24,
      },
      browser: false,
    })
  })
  .use(fastbootRoutes)
