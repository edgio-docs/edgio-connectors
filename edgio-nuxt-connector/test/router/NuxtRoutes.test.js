import { Router } from '@edgio/core/router'
import NuxtRoutes from '../../src/router/NuxtRoutes'
import MockRequest from '../../../core/src/test-utils/MockRequest'
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
    process.chdir(join(__dirname, '..', 'apps', 'server'))

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

  describe('static', () => {
    describe('in production', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production'
      })

      describe('route parsing', () => {
        beforeEach(() => {
          process.chdir(join(__dirname, '..', 'apps', 'static', 'route-parsing'))
          router = new Router().use(new NuxtRoutes())
        })

        it('should return index page (root)', async () => {
          staticPermaNock.get('/dist/').reply(200, 'index')

          const res = response()

          const { rules, functions } = router

          await new RequestContext({
            request: request('https://www.example.com/', {}),
            response: res,
            propertyContext,
            rules,
            cache: new Cache(),
            functions,
          }).execute()

          expect(res.body.toString()).toBe('index')
        })

        it('should return products (nested)', async () => {
          staticPermaNock.get('/dist/products').reply(200, 'product')

          const res = response()

          const { rules, functions } = router

          await new RequestContext({
            request: request('https://www.example.com/products', {}),
            response: res,
            propertyContext,
            rules,
            cache: new Cache(),
            functions,
          }).execute()

          expect(res.body.toString()).toBe('product')
        })
      })

      describe('fallbacks', () => {
        describe('fallback: true', () => {
          beforeEach(() => {
            process.chdir(join(__dirname, '..', 'apps', 'static', 'fallbacks', 'true'))
            router = new Router().use(new NuxtRoutes())
          })

          it('should fallback to 404.html as SPA', async () => {
            staticPermaNock.get('/dist/404.html').reply(200, 'fallback')

            const res = response()

            const { rules, functions } = router

            await new RequestContext({
              request: request('https://www.example.com/doesnt-exist', {}),
              response: res,
              propertyContext,
              rules,
              cache: new Cache(),
              functions,
            }).execute()

            expect(res.body.toString()).toBe('fallback')
          })
        })

        describe('fallback: undefined', () => {
          beforeEach(() => {
            process.chdir(join(__dirname, '..', 'apps', 'static', 'fallbacks', 'undefined'))
            router = new Router().use(new NuxtRoutes())
          })

          it('should fallback to 200.html as SPA', async () => {
            staticPermaNock.get('/dist/200.html').reply(200, 'fallback')

            const res = response()

            const { rules, functions } = router

            await new RequestContext({
              request: request('https://www.example.com/doesnt-exist', {}),
              response: res,
              propertyContext,
              rules,
              cache: new Cache(),
              functions,
            }).execute()

            expect(res.body.toString()).toBe('fallback')
          })
        })

        describe('fallback: false', () => {
          beforeEach(() => {
            process.chdir(join(__dirname, '..', 'apps', 'static', 'fallbacks', 'false'))
            router = new Router().use(new NuxtRoutes())
          })

          it('should return 504 status code', async () => {
            const res = response()

            const { rules, functions } = router

            await new RequestContext({
              request: request('https://www.example.com/doesnt-exist', {}),
              response: res,
              propertyContext,
              rules,
              cache: new Cache(),
              functions,
            }).execute()

            expect(res.statusCode).toBe(502)
          })
        })

        describe('fallback: custom path', () => {
          beforeEach(() => {
            process.chdir(join(__dirname, '..', 'apps', 'static', 'fallbacks', 'path'))
            router = new Router().use(new NuxtRoutes())
          })

          it('should return custom page as SPA', async () => {
            staticPermaNock.get('/dist/custom-404.html').reply(200, 'fallback')

            const res = response()

            const { rules, functions } = router

            await new RequestContext({
              request: request('https://www.example.com/doesnt-exist', {}),
              response: res,
              propertyContext,
              rules,
              cache: new Cache(),
              functions,
            }).execute()

            expect(res.body.toString()).toBe('fallback')
          })
        })
      })
    })
  })

  describe('server', () => {
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
        staticPermaNock.get('/.nuxt/dist/client/index.js').reply(200, 'static')

        const res = response()

        const { rules, functions } = router

        await new RequestContext({
          request: request('https://www.example.com/_nuxt/index.js', {}),
          response: res,
          propertyContext,
          rules,
          cache: new Cache(),
          functions,
        }).execute()

        expect(res.body.toString()).toBe('static')
      })

      it('should far future cache in production mode', async () => {
        staticPermaNock.get('/.nuxt/dist/client/index.js').reply(200, 'static')

        const res = response()

        const { rules, functions } = router

        await new RequestContext({
          request: request('https://www.example.com/_nuxt/index.js', {}),
          response: res,
          propertyContext,
          rules,
          cache: new Cache(),
          functions,
        }).execute()

        expect(res.headers[HTTP_HEADERS.cacheControl]).toBe('max-age=315360000')
      })

      it('should add routes for all static assets', async () => {
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

    describe('in local development', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development'
        router = new Router().use(new NuxtRoutes())
      })

      it('should hit serverless for nuxt assets', async () => {
        serverlessNock.get('/_nuxt/index.js').reply(200, 'static')

        const res = response()

        const { rules, functions } = router

        await new RequestContext({
          request: request('https://www.example.com/_nuxt/index.js', {}),
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
})
