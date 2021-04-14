// This file was automatically added by layer0 deploy.
// You should commit this file to source control.
const { Router } = require('@layer0/core/router')
const { fastbootRoutes } = require('@layer0/fastboot')

module.exports = new Router()
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
