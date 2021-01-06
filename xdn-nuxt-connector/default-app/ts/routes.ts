// This file was added by xdn init.
// You should commit this file to source control.

import { Router } from '@xdn/core/router'
import { nuxtRoutes } from '@xdn/nuxt'

export default new Router()
  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .use(nuxtRoutes)
