import { Router } from '@layer0/core'
import { nuxtRoutes } from '@layer0/nuxt-nitro'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(nuxtRoutes)
