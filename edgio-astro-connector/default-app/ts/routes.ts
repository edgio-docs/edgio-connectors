// This file was automatically added by edgio deploy.
// You should commit this file to source control.
import { Router } from '@edgio/core'
import { astroRoutes } from '@edgio/astro'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(astroRoutes)
