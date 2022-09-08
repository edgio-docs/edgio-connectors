// This file was automatically added by layer0 init.
// You should commit this file to source control.
import { Router } from '@layer0/core'
import { shopifyHydrogenRoutes } from '@layer0/shopify-hydrogen'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(shopifyHydrogenRoutes)
