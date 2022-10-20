import { Router } from '@edgio/core'
import { nuxtRoutes } from '@edgio/nuxt-nitro'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(nuxtRoutes)
