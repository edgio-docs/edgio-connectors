// This file was automatically added by edgio init.
// You should commit this file to source control.
import { Router } from '@edgio/core/router'
import { nodejsRoutes } from '@edgio/nodejs-connector'

export default new Router()
  // automatically adds all routes from the Node.js connector
  .use(nodejsRoutes)
