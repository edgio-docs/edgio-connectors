import NextPathFormatter from '../../../src/router/nextPathFormatter'
import getNextConfig from '../../../src/getNextConfig'
import { join } from 'path'

describe('nextPathFormatter', () => {
  let nextPathFormatter, originalCwd

  beforeAll(async () => {
    originalCwd = process.cwd()
    process.chdir(join(__dirname, '..', '..', 'apps', 'default'))
    const nextConfig = getNextConfig()
    nextPathFormatter = new NextPathFormatter(nextConfig)
  })

  afterAll(() => {
    process.chdir(originalCwd)
  })

  describe('toRouteSyntax', () => {
    it('should support path variables', () => {
      expect(nextPathFormatter.toRouteSyntax('p/[productId].js')).toBe('/p/:productId')
    })

    it('should remove the trailing slash', () => {
      expect(nextPathFormatter.toRouteSyntax('api/index.js')).toBe('/api')
      expect(nextPathFormatter.toRouteSyntax('api/products/index.js')).toBe('/api/products')
      expect(nextPathFormatter.toRouteSyntax('index.js')).toBe('/')
    })

    it('should support multiple path variables', () => {
      expect(nextPathFormatter.toRouteSyntax('p/[category]/[productId]')).toBe(
        '/p/:category/:productId'
      )
    })

    it('should support catch-all routes', () => {
      expect(nextPathFormatter.toRouteSyntax('apiReference/[...module]')).toBe(
        '/apiReference/:module+'
      )
    })

    it('should support optional catch-all routes', () => {
      expect(nextPathFormatter.toRouteSyntax('apiReference/[[...module]]')).toBe(
        '/apiReference/:module*'
      )
    })

    it('should not remove the json suffix', () => {
      expect(nextPathFormatter.toRouteSyntax('/_next/data/buildId/index.json')).toBe(
        '/_next/data/buildId/index.json'
      )
    })
  })

  describe('toCleanPath', () => {
    it('should support index pages', () => {
      expect(nextPathFormatter.toCleanPath('index.js')).toBe('/')
    })

    it('should support default extensions .tsx', () => {
      expect(nextPathFormatter.toCleanPath('main.tsx')).toBe('/main')
    })

    it('should support default extensions .ts', () => {
      expect(nextPathFormatter.toCleanPath('main.ts')).toBe('/main')
    })

    it('should support default extensions .jsx', () => {
      expect(nextPathFormatter.toCleanPath('main.ts')).toBe('/main')
    })

    it('should support default extension .js', () => {
      expect(nextPathFormatter.toCleanPath('main.js')).toBe('/main')
    })

    it('should remove only .js extension', () => {
      expect(nextPathFormatter.toCleanPath('sitemap.xml.js')).toBe('/sitemap.xml')
    })

    it('should keep undefined extension', () => {
      expect(nextPathFormatter.toCleanPath('page.html')).toBe('/page.html')
      expect(nextPathFormatter.toCleanPath('page.d.cjs.png')).toBe('/page.d.cjs.png')
    })
  })

  describe('getDataRoute', () => {
    it('should add :buildId param', () => {
      expect(nextPathFormatter.getDataRoute('/page')).toBe('/_next/data/:buildId/page.json')
    })
    it('should add provided buildId', () => {
      expect(nextPathFormatter.getDataRoute('/page', 'ABCD')).toBe('/_next/data/ABCD/page.json')
    })
    it('should replace / by /index ', () => {
      expect(nextPathFormatter.getDataRoute('/')).toBe('/_next/data/:buildId/index.json')
    })
    it("should preserve next's params format", () => {
      expect(nextPathFormatter.getDataRoute('/page/[id]')).toBe(
        '/_next/data/:buildId/page/[id].json'
      )
    })
  })

  describe('getRouteVariations', () => {
    it('should return routes in path-to-regex format', () => {
      const { route, localizedRoute, dataRoute, localizedDataRoute } =
        nextPathFormatter.getRouteVariations('/page/[id]', { locales: ['en-US', 'nl-NL'] })
      expect(route).toBe('/page/:id')
      expect(localizedRoute).toBe('/:locale(en-US|nl-NL)?/page/:id')
      expect(dataRoute).toBe('/_next/data/:buildId/page/:id.json')
      expect(localizedDataRoute).toBe('/_next/data/:buildId/:locale(en-US|nl-NL)?/page/:id.json')
    })
    it('should not add locale param when locales are empty', () => {
      const { dataRoute, localizedDataRoute } = nextPathFormatter.getRouteVariations('/page/[id]', {
        locales: [],
      })
      expect(dataRoute).toBe('/_next/data/:buildId/page/:id.json')
      expect(localizedDataRoute).toBe('/_next/data/:buildId/page/:id.json')
    })
    it('should replace :buildId param with provided buildId', () => {
      const { dataRoute, localizedDataRoute } = nextPathFormatter.getRouteVariations('/page/[id]', {
        buildId: 'ABCD',
      })
      expect(dataRoute).toBe('/_next/data/ABCD/page/:id.json')
      expect(localizedDataRoute).toBe('/_next/data/ABCD/page/:id.json')
    })
    it('should replace / with index', () => {
      const { dataRoute, localizedDataRoute } = nextPathFormatter.getRouteVariations('/')
      expect(dataRoute).toBe('/_next/data/:buildId/index.json')
      expect(localizedDataRoute).toBe('/_next/data/:buildId/index.json')
    })
  })
})
