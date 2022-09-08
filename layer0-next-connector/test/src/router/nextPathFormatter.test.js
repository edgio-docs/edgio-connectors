import NextPathFormatter from '../../../src/router/nextPathFormatter'
import getNextConfig from '../../../src/getNextConfig'

describe('nextPathFormatter', () => {
  let nextPathFormatter

  beforeAll(async () => {
    const nextConfig = getNextConfig()
    nextPathFormatter = new NextPathFormatter(nextConfig)
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

    it('should accept an optional locale', () => {
      expect(nextPathFormatter.toRouteSyntax('/foo', { locale: 'en-US' })).toBe('/en-US/foo')
    })

    it('should accept an optional suffix', () => {
      expect(nextPathFormatter.toRouteSyntax('/foo', { suffix: 'json' })).toBe('/foo.json')
    })

    it('should not remove index when the suffix is json', () => {
      expect(nextPathFormatter.toRouteSyntax('/', { suffix: 'json' })).toBe('/index.json')
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
})
