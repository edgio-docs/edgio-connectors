// This file was automatically added by layer0 deploy.
// You should commit this file to source control.
import { Router } from '@layer0/core'
import { astroRoutes } from '@layer0/astro'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(astroRoutes)
