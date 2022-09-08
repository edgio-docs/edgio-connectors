// This file was automatically added by layer0 deploy.
// You should commit this file to source control.

import { Router } from '@layer0/core/router'
import { gatsbyRoutes } from '@layer0/gatsby'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(gatsbyRoutes)
