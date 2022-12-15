// This file was automatically added by edgio init.
// You should commit this file to source control.
import { Router } from '@edgio/core'
import { sanityRoutes } from '@edgio/sanity-studio'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(sanityRoutes)
