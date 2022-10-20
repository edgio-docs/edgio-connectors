// Here we intentionally use a non-standard name to test that the routes config in edgio.config.js is respected.
const { Router } = require('@edgio/core/router')
const createNextPlugin = require('@edgio/next/router/createNextPlugin')

module.exports = app => {
  const { renderNext, nextMiddleware } = createNextPlugin(app)

  return new Router()
    .match('/foo/:p', ({ render }) => {
      render((req, res, params) => renderNext(req, res, { productId: params.p }, '/p/[productId]'))
    })
    .use(nextMiddleware)
}
