// This file was automatically added by edgio deploy.
// You should commit this file to source control.

import { Router } from '@edgio/core'
import { vue3Routes } from '@edgio/vue-3'

export default new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .use(vue3Routes)
