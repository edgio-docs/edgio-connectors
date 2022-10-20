// This file was automatically added by edgio deploy.
// You should commit this file to source control.
const { Router } = require('@edgio/core/router')
const { frontityRoutes } = require('@edgio/frontity')

module.exports = new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(frontityRoutes) // automatically adds all routes from your frontity app
