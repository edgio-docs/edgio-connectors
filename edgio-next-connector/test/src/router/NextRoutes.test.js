import { join } from 'path'
import { Router } from '@edgio/core/router'
import { EDGIO_ENV_VARIABLES } from '@edgio/core/constants'
import {
  SERVERLESS_ORIGIN_NAME,
  STATIC_ORIGIN_NAME,
  PERMANENT_STATIC_ORIGIN_NAME,
} from '@edgio/core/origins'
import {
  FAR_FUTURE_CACHE_CONFIG,
  PUBLIC_CACHE_CONFIG,
  SHORT_PUBLIC_CACHE_CONFIG,
} from '../../../src/router/cacheConfig'

describe('NextRoutes', () => {
  let originalCwd,
    NextRoutes,
    nextRoutes,
    mockNextConfig,
    mockEdgioConfig,
    router,
    rules,
    originalNextConfig,
    originalEdgioConfig

  beforeAll(() => {
    global.EDGIO_NEXT_APP = {
      get nextConfig() {
        return mockNextConfig
      },
      loadConfig() {
        return mockNextConfig
      },
    }
    jest.resetAllMocks()

    originalCwd = process.cwd()
    process.chdir(join(__dirname, '..', '..', 'apps', 'default'))

    originalNextConfig = require(join(process.cwd(), 'next.config.js'))
    originalEdgioConfig = require(join(process.cwd(), 'edgio.config.js'))
    mockEdgioConfig = originalEdgioConfig
    mockNextConfig = originalNextConfig

    jest.isolateModules(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {})
      jest.mock('../../../src/getNextConfig', () => jest.fn(() => mockNextConfig))
      jest.mock('@edgio/core/config', () => ({
        getConfig: jest.fn(() => mockEdgioConfig),
      }))
    })
    NextRoutes = require('../../../src/router/NextRoutes').default
  })

  afterAll(() => {
    jest.resetAllMocks()
    process.chdir(originalCwd)
    delete global.EDGIO_NEXT_APP
  })

  describe('development mode', () => {
    beforeAll(() => {
      nextRoutes = new NextRoutes()
      router = new Router()
      router.use(nextRoutes)
      rules = router.rules
    })

    it('should proxy everything to serverless backend by default (addDefaultSSRRoute)', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/(.*)')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
    })

    it('should add rule for service-worker (addServiceWorker)', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/service-worker.js')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
    })

    it('should add rule for devtools (edgioRoutes)', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1].includes('/__edgio__/devtools/'))
      expect(rule).toBeDefined()
    })
  })

  describe('production mode', () => {
    const init = () => {
      process.env[EDGIO_ENV_VARIABLES.deploymentType] = 'AWS'
      process.env.NODE_ENV = 'production'

      nextRoutes = new NextRoutes()
      router = new Router()
      router.use(nextRoutes)
      rules = router.rules
    }

    describe('without localization', () => {
      beforeAll(init)

      it('should proxy everything to serverless backend by default (addDefaultSSRRoute)', () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/(.*)')
        const { origin } = rule?.if[1]
        expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
      })

      describe('should add rules for pages (addPages)', () => {
        it('should not add rules for API pages (handled by addDefaultSSRRoute)', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/api/hello')
          expect(rule).not.toBeDefined()
        })

        it('should not add rules for data route of API pages', () => {
          const rule = rules.find(
            rule => rule?.if?.[0]?.['==']?.[1] === '/_next/data/:buildId/api/hello.json'
          )
          expect(rule).not.toBeDefined()
        })

        it('should not add rules for SSR pages (handled by addDefaultSSRRoute)', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/dynamic/ssr/:id')
          expect(rule).not.toBeDefined()
        })

        it('should not add rules for data route of SSR pages (handled by addDefaultSSRRoute)', () => {
          const rule = rules.find(
            rule => rule?.if?.[0]?.['==']?.[1] === '/_next/data/:buildId/dynamic/ssr/:id.json'
          )
          expect(rule).not.toBeDefined()
        })

        it('should add rules which are returning not found page for ISG/ISR pages with fallback:false', () => {
          const rule = rules.find(
            rule => rule?.if?.[0]?.['and']?.[0]?.['==']?.[1] === '/dynamic/fallback_false/:id'
          )
          const { origin, response } = rule?.if[1]

          expect(response.set_status_code).toBe(404)
          expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
        })

        it('should not add rules for ISG/ISR pages with fallback:blocking (handled by addDefaultSSRRoute)', () => {
          const rule = rules.find(
            rule => rule?.if?.[0]?.['==']?.[1] === '/dynamic/fallback_blocking/:id'
          )
          expect(rule).not.toBeDefined()
        })

        it('should not add rules for ISG/ISR pages with fallback:true (handled by addDefaultSSRRoute)', () => {
          // remove this test once we add support for fallback:true via XBP
          const rule = rules.find(
            rule => rule?.if?.[0]?.['==']?.[1] === '/dynamic/fallback_true/:id'
          )
          expect(rule).not.toBeDefined()
        })
      })

      describe('should add rule for prerendered pages (addPrerenderedPages)', () => {
        it('should add rule for prendered routes of SSG/ISG/ISR pages', () => {
          const rule = rules.find(rule =>
            rule?.if?.[1]?.[1]?.if?.[0]?.['in']?.[1]?.includes('/static')
          )
          const rulePaths = rule?.if?.[1]?.[1]?.if?.[0]?.['in']?.[1]
          const { caching, origin, response } = rule?.if?.[1]?.[1]?.if?.[1]

          // Pre-rendered routes together with trailing slash variants
          expect(rulePaths).toContain('/dynamic/fallback_true/1')
          expect(rulePaths).toContain('/dynamic/fallback_true/1/')
          expect(rulePaths).toContain('/dynamic/fallback_true/2')
          expect(rulePaths).toContain('/dynamic/fallback_true/2/')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/1')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/1/')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/2')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/2/')
          expect(rulePaths).toContain('/dynamic/fallback_false/1')
          expect(rulePaths).toContain('/dynamic/fallback_false/1/')
          expect(rulePaths).toContain('/dynamic/fallback_false/2')
          expect(rulePaths).toContain('/dynamic/fallback_false/2/')
          expect(rulePaths).toContain('/ssg')
          expect(rulePaths).toContain('/ssg/')
          expect(rulePaths).toContain('/static')
          expect(rulePaths).toContain('/static/')
          expect(rulePaths).toContain('/')
          expect(rulePaths).not.toContain('//')
          expect(rulePaths).toContain('/app-folder-page')
          expect(rulePaths).toContain('/app-folder-page/')

          expect(caching.max_age).toBe(PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).not.toBeDefined()
          expect(caching.bypass_client_cache).toBe(true)
          expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
          expect(response.set_status_code).toBe(200)
        })

        it('should add rule for prendered data routes of SSG/ISG/ISR pages', () => {
          const rule = rules.find(rule =>
            rule?.if?.[0]?.['in']?.[1]?.includes('/_next/data/buildId/static.json')
          )
          const rulePaths = rule?.if?.[0]?.['in']?.[1]
          const { caching, origin, response } = rule?.if[1]

          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_true/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_true/2.json')
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_blocking/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_blocking/2.json')
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_false/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_false/2.json')
          expect(rulePaths).toContain('/_next/data/buildId/static.json')
          expect(rulePaths).toContain('/_next/data/buildId/index.json')

          // No need to add JSON file with trailing slash
          expect(rulePaths).not.toContain('/_next/data/buildId/static.json/')
          expect(rulePaths).not.toContain('/_next/data/buildId/index.json/')

          expect(caching.max_age).toBe(FAR_FUTURE_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).toBe(FAR_FUTURE_CACHE_CONFIG.browser.maxAgeSeconds)
          expect(caching.bypass_client_cache).not.toBeDefined()
          expect(origin.set_origin).toBe(PERMANENT_STATIC_ORIGIN_NAME)
          expect(response.set_status_code).toBe(200)
        })

        it('should add separate rule for prendered SSG pages with dynamic route', () => {
          const rule = rules.find(
            rule => rule?.if?.[1]?.[1]?.if?.[0]?.['==']?.[1] === '/dynamic/ssg/:id'
          )
          const { caching, origin } = rule?.if?.[1]?.[1]?.if?.[1]

          expect(caching.max_age).toBe(PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).not.toBeDefined()
          expect(caching.bypass_client_cache).toBe(true)
          expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
        })
      })

      describe('should add rules for public assets (addPublicAssets)', () => {
        it('should add rule for assets from public/ folder', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['in']?.[1]?.includes('/public.txt'))
          const { caching, origin } = rule?.if[1]

          expect(caching.max_age).toBe(SHORT_PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).toBe(SHORT_PUBLIC_CACHE_CONFIG.browser.maxAgeSeconds)
          expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
        })
      })

      describe('should add rules for server assets (addAssets)', () => {
        it('should add rule for: "/_next/static/:path*"', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/_next/static/:path*')
          const { caching, origin } = rule?.if[1]

          expect(caching.max_age).toBe(FAR_FUTURE_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).toBe(FAR_FUTURE_CACHE_CONFIG.browser.maxAgeSeconds)
          expect(origin.set_origin).toBe(PERMANENT_STATIC_ORIGIN_NAME)
        })

        it('should add rule for: "/autostatic/:path*"', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/autostatic/:path*')
          const { caching, origin } = rule?.if[1]

          expect(caching.max_age).toBe(FAR_FUTURE_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).toBe(FAR_FUTURE_CACHE_CONFIG.browser.maxAgeSeconds)
          expect(origin.set_origin).toBe(PERMANENT_STATIC_ORIGIN_NAME)
        })
      })

      it('should add rules for redirects (addRedirects)', () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path+/')
        const urlRedirect = rule?.if[1]?.url?.url_redirect
        const urlRewrite = rule?.if[1]?.url?.url_rewrite[0]

        // Should add redirect
        expect(urlRedirect.code).toBeDefined()
        expect(urlRedirect.source).toContain(
          '(?i)^(?:/((?:[^/#\\?]+?)(?:/(?:[^/#\\?]+?))*))/[/#\\?]?$'
        )
        expect(urlRedirect.destination).toContain('/$1')
        expect(urlRedirect.syntax).toBe('regexp')

        // Should add empty rewrite to remove any previous rewrites that may have been added
        // by serveStatic for example
        expect(urlRewrite.source).toContain('/:path*')
        expect(urlRewrite.destination).toContain('/:path*')
        expect(urlRewrite.syntax).toBe('path-to-regexp')
      })

      it('should add rule for service-worker', () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/service-worker.js')
        const { origin } = rule?.if[1]
        expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
      })

      it('should add rule for devtools (edgioRoutes)', () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1].includes('/__edgio__/devtools/'))
        expect(rule).toBeDefined()
      })

      it('should add rule for Edgio Image Proxy (addEdgioImageProxyRoutes)', () => {
        const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/__edgio__/image')
        const { caching, origin, response } = rule?.if[1]

        expect(caching.max_age).toBe(SHORT_PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
        expect(caching.client_max_age).toBe(SHORT_PUBLIC_CACHE_CONFIG.browser.maxAgeSeconds)
        expect(caching.bypass_client_cache).toBe(undefined)
        expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
        expect(response.optimize_images).toBe(true)
      })

      it('should add rules in correct order', () => {
        const defaultSSRIndex = rules.findIndex(rule => rule?.if?.[0]?.['==']?.[1] === '/(.*)')
        const dynamicRouteIndex = rules.findIndex(
          rule => rule?.if?.[0]?.['==']?.[1] === '/dynamic/ssg/:id'
        )
        const prerenderedRouteIndex = rules.findIndex(rule =>
          rule?.if?.[0]?.['in']?.[1]?.includes('/static')
        )
        const publicAssetIndex = rules.findIndex(
          rule => rule?.if?.[0]?.['==']?.[1] === '/public.txt'
        )
        const redirectIndex = rules.findIndex(rule => rule?.if?.[0]?.['==']?.[1] === '/:path+/')

        expect(
          defaultSSRIndex <
            dynamicRouteIndex <
            prerenderedRouteIndex <
            publicAssetIndex <
            redirectIndex
        ).toBe(true)
      })
    })

    describe('with localization', () => {
      beforeAll(() => {
        process.chdir(join(__dirname, '..', '..', 'apps', 'with-localization'))
        mockNextConfig = require(join(process.cwd(), 'next.config.js'))
        init()
      })
      afterAll(() => {
        process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
        mockNextConfig = originalNextConfig
        init()
      })

      describe('should add rules for pages (addPages)', () => {
        it('should add rules which are returning not found page for ISG/ISR pages with fallback:false', () => {
          const rule = rules.find(
            rule =>
              rule?.if?.[0]?.['and']?.[0]?.['==']?.[1] ===
              '/:locale(en-US|fr|nl-NL)?/dynamic/fallback_false/:id'
          )
          const { origin, response } = rule?.if[1]

          expect(response.set_status_code).toBe(404)
          expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
        })

        it('should not add rules for ISG/ISR pages with fallback:blocking (handled by addDefaultSSRRoute)', () => {
          const rule = rules.find(
            rule =>
              rule?.if?.[0]?.['==']?.[1] ===
              '/:locale(en-US|fr|nl-NL)?/dynamic/fallback_blocking/:id'
          )
          expect(rule).not.toBeDefined()
        })

        it('should not add rules for ISG/ISR pages with fallback:true (handled by addDefaultSSRRoute)', () => {
          // remove this test once we add support for fallback:true via XBP
          const rule = rules.find(
            rule =>
              rule?.if?.[0]?.['==']?.[1] === '/:locale(en-US|fr|nl-NL)?/dynamic/fallback_true/:id'
          )
          expect(rule).not.toBeDefined()
        })
      })

      describe('should add rule for prerendered pages (addPrerenderedPages)', () => {
        it('should add rule for prendered routes of SSG/ISG/ISR pages', () => {
          const rule = rules.find(rule =>
            rule?.if?.[1]?.[1]?.if?.[0]?.['in']?.[1]?.includes('/static')
          )
          const rulePaths = rule?.if?.[1]?.[1]?.if?.[0]?.['in']?.[1]
          const { caching, origin, response } = rule?.if?.[1]?.[1]?.if?.[1]

          // Pre-rendered routes together with trailing slash variants
          // Without default locale
          expect(rulePaths).toContain('/dynamic/fallback_true/1')
          expect(rulePaths).toContain('/dynamic/fallback_true/1/')
          expect(rulePaths).toContain('/dynamic/fallback_true/2')
          expect(rulePaths).toContain('/dynamic/fallback_true/2/')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/1')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/1/')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/2')
          expect(rulePaths).toContain('/dynamic/fallback_blocking/2/')
          expect(rulePaths).toContain('/dynamic/fallback_false/1')
          expect(rulePaths).toContain('/dynamic/fallback_false/1/')
          expect(rulePaths).toContain('/dynamic/fallback_false/2')
          expect(rulePaths).toContain('/dynamic/fallback_false/2/')
          expect(rulePaths).toContain('/ssg')
          expect(rulePaths).toContain('/ssg/')
          expect(rulePaths).toContain('/static')
          expect(rulePaths).toContain('/static/')
          expect(rulePaths).toContain('/')

          // With default locale
          expect(rulePaths).toContain('/en-US/dynamic/fallback_true/1')
          expect(rulePaths).toContain('/en-US/dynamic/fallback_true/1/')
          expect(rulePaths).toContain('/en-US/dynamic/fallback_blocking/1')
          expect(rulePaths).toContain('/en-US/dynamic/fallback_blocking/1/')
          expect(rulePaths).toContain('/en-US/dynamic/fallback_false/1')
          expect(rulePaths).toContain('/en-US/dynamic/fallback_false/1/')

          // With all other locales
          expect(rulePaths).toContain('/ssg')
          expect(rulePaths).toContain('/ssg/')
          expect(rulePaths).toContain('/en-US/ssg')
          expect(rulePaths).toContain('/en-US/ssg/')
          expect(rulePaths).toContain('/fr/ssg')
          expect(rulePaths).toContain('/fr/ssg/')
          expect(rulePaths).toContain('/nl-NL/ssg')
          expect(rulePaths).toContain('/nl-NL/ssg/')

          expect(rulePaths).toContain('/')
          expect(rulePaths).not.toContain('//')

          expect(rulePaths).toContain('/en-US')
          expect(rulePaths).toContain('/en-US/')
          expect(rulePaths).toContain('/fr')
          expect(rulePaths).toContain('/fr/')

          expect(caching.max_age).toBe(PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).not.toBeDefined()
          expect(caching.bypass_client_cache).toBe(true)
          expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
          expect(response.set_status_code).toBe(200)
        })

        it('should add rule for prendered data routes of SSG/ISG/ISR pages', () => {
          const rule = rules.find(rule =>
            rule?.if?.[0]?.['in']?.[1]?.includes('/_next/data/buildId/static.json')
          )
          const rulePaths = rule?.if?.[0]?.['in']?.[1]
          const { caching, origin, response } = rule?.if[1]

          // Without default locale
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_true/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_blocking/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/dynamic/fallback_false/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/static.json')
          expect(rulePaths).toContain('/_next/data/buildId/index.json')

          // With default locale
          expect(rulePaths).toContain('/_next/data/buildId/en-US/dynamic/fallback_true/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/en-US/dynamic/fallback_blocking/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/en-US/dynamic/fallback_false/1.json')
          expect(rulePaths).toContain('/_next/data/buildId/en-US/static.json')
          expect(rulePaths).toContain('/_next/data/buildId/en-US.json')

          // With all other locales
          expect(rulePaths).toContain('/_next/data/buildId/fr/static.json')
          expect(rulePaths).toContain('/_next/data/buildId/nl-NL/static.json')

          expect(caching.max_age).toBe(FAR_FUTURE_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).toBe(FAR_FUTURE_CACHE_CONFIG.browser.maxAgeSeconds)
          expect(caching.bypass_client_cache).not.toBeDefined()
          expect(origin.set_origin).toBe(PERMANENT_STATIC_ORIGIN_NAME)
          expect(response.set_status_code).toBe(200)
        })

        it('should add separate rule for prendered SSG pages with dynamic route', () => {
          const rule = rules.find(
            rule => rule?.if?.[1]?.[1]?.if?.[0]?.['==']?.[1] === '/en-US/dynamic/ssg/:id'
          )
          const { caching, origin } = rule?.if?.[1]?.[1]?.if?.[1]

          expect(caching.max_age).toBe(PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).not.toBeDefined()
          expect(caching.bypass_client_cache).toBe(true)
          expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
        })
      })
    })

    describe('special cases', () => {
      const reset = () => {
        mockNextConfig = JSON.parse(JSON.stringify(originalNextConfig))
        mockEdgioConfig = JSON.parse(JSON.stringify(originalEdgioConfig))
        init()
      }

      describe('with basePath property in next.config.js', () => {
        beforeAll(() => {
          mockNextConfig = { ...mockNextConfig, basePath: '/docs' }
          init()
        })
        afterAll(reset)

        it('should add base path in front of page route', () => {
          const rule = rules.find(
            rule => rule?.if?.[1]?.[1]?.if?.[0]?.['==']?.[1] === '/docs/dynamic/ssg/:id'
          )
          expect(rule).toBeDefined()
        })
      })

      describe('proxyToServerlessByDefault is false', () => {
        beforeAll(() => {
          mockEdgioConfig = {
            ...mockEdgioConfig,
            next: { ...mockEdgioConfig.next, proxyToServerlessByDefault: false },
          }
          init()
        })
        afterAll(reset)

        it('should not add default SSR rule when "proxyToServerlessByDefault" is false', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/(.*)')
          expect(rule?.if[1]?.origin?.set_origin).not.toBe(SERVERLESS_ORIGIN_NAME)
        })

        it('should add each route as a separate rule (/dynamic/fallback_blocking/:id)', () => {
          const rule = rules.find(
            rule => rule?.if?.[0]?.['==']?.[1] === '/dynamic/fallback_blocking/:id'
          )
          expect(rule?.if[1]?.origin?.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
        })

        it('should add each route as a separate rule (/_next/data/:buildId/dynamic/fallback_blocking/:id.json)', () => {
          const rule = rules.find(
            rule =>
              rule?.if?.[0]?.['==']?.[1] ===
              '/_next/data/:buildId/dynamic/fallback_blocking/:id.json'
          )
          expect(rule?.if[1]?.origin?.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
        })

        it('should add each route as a separate rule (/dynamic/fallback_blocking/:id)', () => {
          const rule = rules.find(
            rule => rule?.if?.[0]?.['==']?.[1] === '/dynamic/fallback_blocking/:id'
          )
          expect(rule?.if[1]?.origin?.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
        })

        it('should add each route as a separate rule (/_next/data/:buildId/dynamic/fallback_true/:id.json)', () => {
          const rule = rules.find(
            rule =>
              rule?.if?.[0]?.['==']?.[1] === '/_next/data/:buildId/dynamic/fallback_true/:id.json'
          )
          expect(rule?.if[1]?.origin?.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
        })

        it('should add each route as a separate rule (/api/hello)', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/api/hello')
          expect(rule?.if[1]?.origin?.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
        })
      })

      describe('enforceTrailingSlash is false', () => {
        beforeAll(() => {
          mockEdgioConfig = {
            ...mockEdgioConfig,
            next: { ...mockEdgioConfig.next, enforceTrailingSlash: false },
          }
          init()
        })
        afterAll(reset)

        it('should not add rule with internal redirect when "enforceTrailingSlash" is false', () => {
          const rule = rules.find(
            rule =>
              rule?.if?.[0]?.['=~']?.[1] ===
              '(?i)^(?:/((?:[^/#\\?]+?)(?:/(?:[^/#\\?]+?))*))/[/#\\?]?$'
          )
          expect(rule).not.toBeDefined()
        })
      })

      describe('disableImageOptimizer is true', () => {
        beforeAll(() => {
          mockEdgioConfig = {
            ...mockEdgioConfig,
            next: { ...mockEdgioConfig.next, disableImageOptimizer: true },
          }
          init()
        })
        afterAll(reset)

        it('should add rule for next image optimizer (addEdgioImageOptimizerRoutes)', () => {
          const rule = rules.find(
            rule => rule?.if?.[0]?.['==']?.[1] === '/_next/(image|future/image)'
          )
          const { caching, origin } = rule?.if[1]

          expect(caching.max_age).toBe(SHORT_PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
          expect(caching.client_max_age).toBe(SHORT_PUBLIC_CACHE_CONFIG.browser.maxAgeSeconds)
          expect(caching.bypass_client_cache).toBe(undefined)
          expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
        })

        it('should not add rule for Edgio Image Proxy (addEdgioImageProxyRoutes)', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/__edgio__/image')
          expect(rule).not.toBeDefined()
        })
      })

      describe('disableServiceWorker is true', () => {
        beforeAll(() => {
          mockEdgioConfig = {
            ...mockEdgioConfig,
            next: { ...mockEdgioConfig.next, disableServiceWorker: true },
          }
          init()
        })
        afterAll(reset)

        it('should not add rule for service-worker when "disableServiceWorker" is true', () => {
          const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/service-worker.js')
          expect(rule).not.toBeDefined()
        })
      })
    })
  })
})
