// This file was automatically added by edgio deploy.
// You should commit this file to source control.
import { Router } from '@edgio/core/router'
import { frontityRoutes } from '@edgio/frontity'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(frontityRoutes) // automatically adds all routes from your frontity app
