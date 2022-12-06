// This file was automatically added by edgio deploy.
// You should commit this file to source control.

const { Router } = require('@edgio/core/router')
const { gatsbyRoutes } = require('@edgio/gatsby')

module.exports = new Router().use(gatsbyRoutes)
