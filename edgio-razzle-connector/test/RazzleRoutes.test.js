describe('RazzleRoutes', () => {
  let Router, cache, serveStatic, renderWithApp, request, response, RazzleRoutes

  beforeEach(() => {
    cache = jest.fn()
    serveStatic = jest.fn()
    renderWithApp = jest.fn()
    const responseHeaders = {}

    jest.doMock('@edgio/core/router/ResponseWriter', () => {
      return class MockResponseWriter {
        constructor() {
          this.cache = cache
          this.serveStatic = serveStatic
          this.renderWithApp = renderWithApp
          this.onRouteError = jest.fn()
        }
      }
    })

    Router = require('@edgio/core/router/Router').default

    request = {
      url: '/',
      headers: {
        host: 'domain.com',
      },
      on: (event, cb) => {
        if (event === 'data') {
          setImmediate(() => cb(request.body))
        } else if (event === 'end') {
          setImmediate(cb)
        }
      },
    }

    response = {
      writeHead: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn((header, value) => (responseHeaders[header] = value)),
      getHeaders: jest.fn(() => []),
    }

    RazzleRoutes = require('../src/RazzleRoutes').default
  })

  describe('in production', () => {
    const env = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = env
    })

    it('should serve static assets', async () => {
      request.path = '/static/list.module.a1a99376d94755df9cab.js'
      await new Router().use(new RazzleRoutes()).run(request, response)
      expect(serveStatic).toHaveBeenCalledWith('build/public/static/:path*', { permanent: true })

      const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

      expect(cache).toHaveBeenCalledWith({
        browser: {
          maxAgeSeconds: FAR_FUTURE_TTL,
        },
        edge: {
          maxAgeSeconds: FAR_FUTURE_TTL,
        },
      })
    })

    it('should fallback to SSR', async () => {
      request.path = '/'
      await new Router().use(new RazzleRoutes()).run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
    })
  })

  describe('in development', () => {
    it('should fallback to SSR', async () => {
      request.path = '/static/list.module.a1a99376d94755df9cab.js'
      await new Router().use(new RazzleRoutes()).run(request, response)
      expect(renderWithApp).toHaveBeenCalled()
    })
  })
})
