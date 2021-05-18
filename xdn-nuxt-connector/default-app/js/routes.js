// This file was added by xdn init.
// You should commit this file to source control.

const { Router } = require('@xdn/core/router')
const { nuxtRoutes } = require('@xdn/nuxt')

module.exports = new Router()
  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .use(nuxtRoutes)
