// This file was automatically added by layer0 deploy.
// You should commit this file to source control.

const { Router } = require('@layer0/core/router')
const { angularRoutes } = require('@layer0/angular')

module.exports = new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(angularRoutes)
