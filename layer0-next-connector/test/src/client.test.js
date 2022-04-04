import { createNextDataURL } from '../../src/client'

describe('createNextDataURL', () => {
  describe('in the browser', () => {
    beforeEach(() => {
      window.__NEXT_DATA__ = { buildId: 'abc123' }
    })
    it('should accept query params', () => {
      expect(createNextDataURL({ href: '/products/1', routeParams: { id: 1 } })).toBe(
        '/_next/data/abc123/products/1.json?id=1'
      )
    })
    it('should not require query params', () => {
      expect(createNextDataURL({ href: '/products' })).toBe('/_next/data/abc123/products.json')
    })
    it('should not accept an index route', () => {
      expect(createNextDataURL({ href: '/' })).toBe('/_next/data/abc123/index.json')
    })
    it('should not fail if route params is nullish', () => {
      expect(createNextDataURL({ href: '/', routeParams: null })).toBe(
        '/_next/data/abc123/index.json'
      )
    })
  })

  describe('on the server', () => {
    beforeEach(() => {
      delete window.__NEXT_DATA__
    })
    it('should return undefined', () => {
      expect(createNextDataURL({ href: '/products/1', routeParams: { id: 1 } })).toBeUndefined()
    })
  })
})
