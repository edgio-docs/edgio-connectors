// This file was automatically added by edgio init.
// You should commit this file to source control.
const { Router } = require('@edgio/core/router')
const { customRoutes } = require('@edgio/custom-connector')

module.exports = new Router().use(customRoutes) // automatically adds all routes from your custom connector
