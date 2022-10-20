// This file was added by edgio init.
// You should commit this file to source control.

const { Router } = require('@edgio/core/router')
const { nuxtRoutes } = require('@edgio/nuxt')

module.exports = new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .use(nuxtRoutes)
