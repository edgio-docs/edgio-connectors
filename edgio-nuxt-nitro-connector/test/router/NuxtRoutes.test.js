import { Router } from '@edgio/core/router'
import NuxtRoutes from '../../src/router/NuxtRoutes'
import MockRequest from '../../../core/test/mocks/MockRequest'
import MockResponse from '../../../core/test/mocks/MockResponse'
import PropertyContext from '../../../core/src/runtime/PropertyContext'
import nock from 'nock'
import {
  createPermanentStaticOrigin,
  createServerlessOrigin,
  createStaticOrigin,
} from '../../../core/src/origins'
import RequestContext from '../../../core/src/runtime/RequestContext'
import Cache from '../../../core/src/runtime/Cache'
import { HTTP_HEADERS } from '../../../core/src/constants'
import { join } from 'path'

function request(url, options) {
  return new MockRequest(url, options)
}

function response() {
  return new MockResponse()
}

describe('NuxtRoutes', () => {
  let router,
    serverlessNock,
    // staticNock,
    staticPermaNock,
    propertyContext,
    env = process.env.NODE_ENV,
    cwd = process.cwd()

  beforeEach(() => {
    process.chdir(join(__dirname, '..', 'apps', 'test'))

    router = new Router().use(new NuxtRoutes())

    serverlessNock = nock('http://127.0.0.1:3001')
    // TODO: how to think about this? how does it relate to remote?
    // staticNock = nock('http://127.0.0.1:3002')
    staticPermaNock = nock('http://127.0.0.1:3002')

    propertyContext = new PropertyContext({
      hostnames: [
        {
          hostname: 'www.example.com',
          default_origin_name: 'web',
        },
      ],
      origins: [
        {
          name: 'web',
          balancer: 'round_robin',
          hosts: [{ location: 'origin1.www.example.com' }],
        },
        createStaticOrigin(),
        createPermanentStaticOrigin(),
        createServerlessOrigin(),
      ],
    })
  })

  afterEach(() => {
    process.env.NODE_ENV = env
    process.chdir(cwd)
  })

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      router = new Router().use(new NuxtRoutes())
    })

    it('should fallback to dynamic 404', async () => {
      serverlessNock.get('/not-found').reply(404, '404')

      const res = response()

      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/not-found', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).execute()

      expect(res.body.toString()).toBe('404')
    })

    it('should serve static assets before dynamic pages', async () => {
      staticPermaNock.get('/.output/public/_nuxt/pages/index.js').reply(200, 'static')

      const res = response()

      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/_nuxt/pages/index.js', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).execute()

      expect(res.body.toString()).toBe('static')
    })

    it('should far future cache in production mode', async () => {
      staticPermaNock.get('/.output/public/_nuxt/pages/index.js').reply(200, 'static')

      const res = response()

      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/_nuxt/pages/index.js', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).execute()

      expect(res.headers[HTTP_HEADERS.cacheControl]).toBe('max-age=315360000')
    })

    it('should add routes for all public assets', async () => {
      staticPermaNock.get('/.output/public/favicon.ico').reply(200, 'icon')

      const res = response()

      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/favicon.ico', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).execute()

      expect(res.body.toString()).toBe('icon')
    })

    it('should add a route for the service worker', async () => {
      staticPermaNock.get('/.output/public/_nuxt/service-worker.js').reply(200, 'service-worker')

      const res = response()

      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/service-worker.js', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).execute()

      expect(res.body.toString()).toBe('service-worker')
    })
  })

  describe('in development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      router = new Router().use(new NuxtRoutes())
    })

    it('should hit serverless for nuxt assets', async () => {
      serverlessNock.get('/_nuxt/pages/index.js').reply(200, 'static')

      const res = response()

      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/_nuxt/pages/index.js', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).execute()

      expect(res.body.toString()).toBe('static')
    })

    it('should add routes for all public assets', async () => {
      staticPermaNock.get('/static/favicon.ico').reply(200, 'icon')

      const res = response()

      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/favicon.ico', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).execute()

      expect(res.body.toString()).toBe('icon')
    })
  })
})
