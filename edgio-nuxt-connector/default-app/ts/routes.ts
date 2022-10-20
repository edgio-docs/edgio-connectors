// This file was added by edgio init.
// You should commit this file to source control.

import { Router } from '@edgio/core/router'
import { nuxtRoutes } from '@edgio/nuxt'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .use(nuxtRoutes)
