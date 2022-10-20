// This file was automatically added by edgio init.
// You should commit this file to source control.
import { Router } from '@edgio/core'
import { redwoodRoutes } from '@edgio/redwood'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(redwoodRoutes)
