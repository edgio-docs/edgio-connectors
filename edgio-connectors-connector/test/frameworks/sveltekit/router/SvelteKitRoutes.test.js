import { Router } from '@edgio/core/router'
import { SERVERLESS_ORIGIN_NAME, STATIC_ORIGIN_NAME } from '@edgio/core/origins'
import { join } from 'path'
import SvelteKitRoutes from '../../../../src/frameworks/sveltekit/SvelteKitRoutes'
import {
  PUBLIC_CACHE_CONFIG,
  FAR_FUTURE_CACHE_CONFIG,
} from '../../../../src/frameworks/sveltekit/constants'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { createEdgioFS } from '@edgio/core/edgio.fs'

describe('SvelteKitRoutes.ts', () => {
  let originalDir, svelteKitRoutes, router, rules

  beforeAll(() => {
    originalDir = process.cwd()
  })

  afterAll(() => {
    process.chdir(originalDir)
  })

  const init = (devMode = false) => {
    const fs = createEdgioFS(join(__dirname, '../apps/default'))
    EdgioRuntimeGlobal.runtimeOptions = {
      devMode,
      isProductionBuild: !devMode,
      isCacheEnabled: false,
      origins: [],
      entryFile: '',
      fs,
    }
    svelteKitRoutes = new SvelteKitRoutes()
    router = new Router().use(svelteKitRoutes)
    rules = router.rules
  }

  describe('production mode', () => {
    beforeEach(() => {
      init(false)
    })

    it('should render all pages with renderWithApp by default', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
    })

    it('should add rule for service-worker', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/service-worker.js')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
    })

    it('should add rule for assets in ".svelte-kit/output/client" folder', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['in']?.[1]?.includes('/style.css'))
      const rulePaths = rule?.if?.[0]?.['in']?.[1]

      const { caching, origin } = rule?.if[1]

      expect(rulePaths).toContain('/style.css')
      expect(rulePaths).toContain('/static_asset.txt')

      expect(caching.max_age).toBe(PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
      expect(caching.bypass_client_cache).toBe(true)
      expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
    })

    it('should cache assets with hash under "/_app/" path in the browser', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/_app/:path*')
      const { caching } = rule?.if[1]
      expect(caching.max_age).toBe(FAR_FUTURE_CACHE_CONFIG.edge.maxAgeSeconds)
      expect(caching.client_max_age).toBe(FAR_FUTURE_CACHE_CONFIG.browser.maxAgeSeconds)
    })

    // These pages are copied to '.edgio/tmp/prerendered_pages' dir during build
    it('should add rule for pre-rendered HTML pages', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['in']?.[1]?.includes('/'))
      const rulePaths = rule?.if?.[0]?.['in']?.[1]

      const { caching, origin } = rule?.if[1]

      expect(rulePaths).toContain('/')
      expect(rulePaths).toContain('/about')

      expect(caching.max_age).toBe(PUBLIC_CACHE_CONFIG.edge.maxAgeSeconds)
      expect(caching.bypass_client_cache).toBe(true)
      expect(origin.set_origin).toBe(STATIC_ORIGIN_NAME)
    })
  })

  describe('development mode', () => {
    beforeEach(() => {
      init(true)
    })
    it('should render all pages with renderWithApp', () => {
      const rule = rules.find(rule => rule?.if?.[0]?.['==']?.[1] === '/:path*')
      const { origin } = rule?.if[1]
      expect(origin.set_origin).toBe(SERVERLESS_ORIGIN_NAME)
    })
  })
})
