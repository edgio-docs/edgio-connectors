// This file was automatically added by xdn deploy.
// You should commit this file to source control.
const { Router } = require('@xdn/core/router')
const { frontityRoutes } = require('@xdn/frontity')

module.exports = new Router().use(frontityRoutes) // automatically adds all routes from your frontity app
