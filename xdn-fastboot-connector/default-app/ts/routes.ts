// This file was automatically added by xdn deploy.
// You should commit this file to source control.
import { Router } from '@xdn/core/router'
import { fastbootRoutes } from '@xdn/fastboot'

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
