// This file was automatically added by xdn deploy.
// You should commit this file to source control.
import { Router } from '@xdn/core/router'
import { nextRoutes } from '@xdn/next'

export default new Router()
  .match('/service-worker.js', ({ serviceWorker }) => {
    return serviceWorker('.next/static/service-worker.js')
  })
  .use(nextRoutes) // automatically adds routes for all files under /pages
