// This file was automatically added by edgio deploy.
// You should commit this file to source control.
import { Router } from '@edgio/core/router'
import { customRoutes } from '@edgio/custom-connector'

export default new Router().use(customRoutes) // automatically adds all routes from your frontity app
