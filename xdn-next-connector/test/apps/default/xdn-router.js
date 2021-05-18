// Here we intentionally use a non-standard name to test that the routes config in xdn.config.js is respected.
const { Router } = require('@xdn/core/router')
const createNextPlugin = require('@xdn/next/router/createNextPlugin')

module.exports = app => {
  const { renderNext, nextMiddleware } = createNextPlugin(app)

  return new Router()
    .match('/foo/:p', ({ render }) => {
      render((req, res, params) => renderNext(req, res, { productId: params.p }, '/p/[productId]'))
    })
    .use(nextMiddleware)
}
