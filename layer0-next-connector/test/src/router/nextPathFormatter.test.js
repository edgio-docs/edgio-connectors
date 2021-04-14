import { toRouteSyntax, toCleanPath } from '../../../src/router/nextPathFormatter'

describe('nextPathFormatter', () => {
  describe('toRouteSyntax', () => {
    it('should support path variables', () => {
      expect(toRouteSyntax('p/[productId].js')).toBe('/p/:productId')
    })

    it('should remove the trailing slash', () => {
      expect(toRouteSyntax('api/index.js')).toBe('/api')
      expect(toRouteSyntax('api/products/index.js')).toBe('/api/products')
      expect(toRouteSyntax('index.js')).toBe('/')
    })

    it('should support multiple path variables', () => {
      expect(toRouteSyntax('p/[category]/[productId]')).toBe('/p/:category/:productId')
    })

    it('should support catch-all routes', () => {
      expect(toRouteSyntax('apiReference/[...module]')).toBe('/apiReference/:module+')
    })

    it('should support optional catch-all routes', () => {
      expect(toRouteSyntax('apiReference/[[...module]]')).toBe('/apiReference/:module*')
    })

    it('should accept an optional locale', () => {
      expect(toRouteSyntax('/foo', { locale: 'en-US' })).toBe('/en-US/foo')
    })

    it('should accept an optional suffix', () => {
      expect(toRouteSyntax('/foo', { suffix: 'json' })).toBe('/foo.json')
    })

    it('should not remove index when the suffix is json', () => {
      expect(toRouteSyntax('/', { suffix: 'json' })).toBe('/index.json')
    })
  })

  describe('toCleanPath', () => {
    it('should support index pages', () => {
      expect(toCleanPath('index.js')).toBe('/')
    })

    it('should support extensions', () => {
      expect(toCleanPath('main.html')).toBe('/main')
    })
  })
})
