import { Router } from '@edgio/core/router'
import NuxtRoutes from '../../src/router/NuxtRoutes'
import MockRequest from '../../../core/src/test-utils/MockRequest'
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
import { LambdaResponse } from '../../../core/src'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { createEdgioFS } from '@edgio/core/edgio.fs'

function request(url, options) {
  return new MockRequest(url, options)
}

function response() {
  return new LambdaResponse()
}

describe('NuxtRoutes', () => {
  let router, serverlessNock, staticPermaNock, propertyContext

  beforeEach(() => {
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

  describe('config tests', () => {
    it('should go to serverless by default', async () => {
      const fs = createEdgioFS(join(__dirname, '../apps/default'))
      EdgioRuntimeGlobal.runtimeOptions = {
        devMode: false,
        isProductionBuild: true,
        isCacheEnabled: false,
        origins: [],
        entryFile: '',
        fs,
      }

      serverlessNock.get('/whatever').reply(200, 'whatever')

      const res = response()

      router = new Router().use(new NuxtRoutes())
      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/whatever', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).executeSimulator()

      expect(res.body.toString()).toBe('whatever')
    })

    it('should NOT go to serverless by default when proxyToServerless is turned off in config', async () => {
      const fs = createEdgioFS(join(__dirname, '../apps/no-serverless'))
      EdgioRuntimeGlobal.runtimeOptions = {
        devMode: false,
        isProductionBuild: true,
        isCacheEnabled: false,
        origins: [],
        entryFile: '',
        fs,
      }

      serverlessNock.get('/whatever').reply(200, 'whatever')

      const res = response()

      router = new Router().use(new NuxtRoutes())
      const { rules, functions } = router

      await new RequestContext({
        request: request('https://www.example.com/whatever', {}),
        response: res,
        propertyContext,
        rules,
        cache: new Cache(),
        functions,
      }).executeSimulator()

      expect(res.statusCode).toBe(502)
    })
  })

  describe('in production', () => {
    beforeEach(() => {
      const fs = createEdgioFS(join(__dirname, '../apps/default'))
      EdgioRuntimeGlobal.runtimeOptions = {
        devMode: false,
        isProductionBuild: true,
        isCacheEnabled: false,
        origins: [],
        entryFile: '',
        fs,
      }

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
      }).executeSimulator()

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
      }).executeSimulator()

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
      }).executeSimulator()

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
      }).executeSimulator()

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
      }).executeSimulator()

      expect(res.body.toString()).toBe('service-worker')
    })
  })

  describe('in development', () => {
    beforeEach(() => {
      process.cwd = jest.fn(() => join(__dirname, '../apps/default'))
      const fs = createEdgioFS(join(__dirname, '../apps/default'))
      EdgioRuntimeGlobal.runtimeOptions = {
        devMode: false,
        isProductionBuild: false,
        isCacheEnabled: false,
        origins: [],
        entryFile: '',
        fs,
      }
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
      }).executeSimulator()

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
      }).executeSimulator()

      expect(res.body.toString()).toBe('icon')
    })
  })
})
