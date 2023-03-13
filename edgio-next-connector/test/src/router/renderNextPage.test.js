describe('renderNextPage', () => {
  let warn, renderNextPage

  beforeEach(() => {
    jest.resetAllMocks()
    jest.resetModules()

    jest.isolateModules(() => {
      jest.doMock('../../../src/util/getNextVersion', () => () => '10.0.0')
      warn = jest.spyOn(console, 'warn').mockImplementation()
      renderNextPage = require('../../../src/router/renderNextPage').renderNextPage
    })
  })

  describe('target: serverless', () => {
    it('should send a x-next-page header', async () => {
      const proxy = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()
      const request = { url: '/p/1', query: { foo: 'bar' } }

      await renderNextPage(
        '/p/[productId]',
        { proxy, request, updateUpstreamResponseHeader },
        {
          productId: '1',
        }
      )

      expect(proxy).toHaveBeenCalledWith('__js__', {
        path: expect.any(Function),
        headers: {
          'x-next-page': '/p/[productId]',
        },
        transformResponse: expect.any(Function),
      })

      expect(updateUpstreamResponseHeader).toHaveBeenCalledWith(
        'cache-control',
        /(,\s*\bprivate\b\s*)|(^\s*private,\s*)/g,
        ''
      )

      expect(proxy.mock.calls[0][1].path()).toBe('/p/1?foo=bar&productId=1')
    })

    it('should work without params parameter', () => {
      const proxy = jest.fn()
      const setRequestHeader = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()
      const params = { productId: 1 }
      const request = { url: '/p/1', query: { foo: 'bar' }, params }

      renderNextPage('/p/[productId]', {
        proxy,
        setRequestHeader,
        updateUpstreamResponseHeader,
        request,
      })

      expect(proxy).toHaveBeenCalledWith('__js__', {
        path: expect.any(Function),
        transformResponse: expect.any(Function),
        headers: {
          'x-next-page': '/p/[productId]',
        },
      })

      expect(proxy.mock.calls[0][1].path()).toBe('/p/1?foo=bar&productId=1')
    })

    it('should accept a function for params', () => {
      const proxy = jest.fn()
      const setRequestHeader = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()
      const params = { id: 1 }
      const request = { url: '/p/1', query: { foo: 'bar' }, params }
      const fn = jest.fn(() => ({
        productId: '1',
      }))

      renderNextPage(
        '/p/[productId]',
        { proxy, setRequestHeader, updateUpstreamResponseHeader, request },
        fn
      )

      expect(proxy).toHaveBeenCalledWith('__js__', {
        path: expect.any(Function),
        transformResponse: expect.any(Function),
        headers: {
          'x-next-page': '/p/[productId]',
        },
      })

      expect(proxy.mock.calls[0][1].path()).toBe('/p/1?foo=bar&productId=1')

      expect(fn).toHaveBeenCalledWith(params, request)
    })

    it('should not include ? in the uri when there are no query params', () => {
      const proxy = jest.fn()
      const setRequestHeader = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()
      const request = { url: '/', query: {}, params: {} }

      renderNextPage('/', {
        proxy,
        setRequestHeader,
        updateUpstreamResponseHeader,
        request,
      })

      expect(proxy.mock.calls[0][1].path()).toBe('/')
    })

    it('should properly rewrite data urls', () => {
      const proxy = jest.fn()
      const setRequestHeader = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()

      const request = {
        path: '/_next/data/123/catalog/1',
        url: '/_next/data/123/catalog/1',
        query: {},
        params: { productId: '1', __build__: '123' },
      }

      renderNextPage('products/[productId]', {
        proxy,
        setRequestHeader,
        updateUpstreamResponseHeader,
        request,
      })

      expect(proxy.mock.calls[0][1].path()).toBe(
        '/_next/data/123/products/1.json?productId=1&__build__=123'
      )
    })

    it('should accept an options object', () => {
      const proxy = jest.fn()
      const setRequestHeader = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()

      const request = {
        path: '/_next/data/123/catalog/1.json',
        url: '/_next/data/123/catalog/1.json',
        query: {},
        params: { productId: '1', __build__: '123' },
      }

      renderNextPage(
        'products/[productId]',
        {
          proxy,
          setRequestHeader,
          updateUpstreamResponseHeader,
          request,
        },
        params => params,
        { rewritePath: false }
      )

      expect(proxy.mock.calls[0][1].path()).toBe(
        '/_next/data/123/catalog/1.json?productId=1&__build__=123'
      )
    })

    it('should stringify duplicates without indexes in names', () => {
      const proxy = jest.fn()
      const setRequestHeader = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()

      const request = {
        path: '/_next/data/123/catalog/1.json',
        url: '/_next/data/123/catalog/1.json',
        query: {},
        params: { slug: ['1', '2'], __build__: '123' },
      }

      renderNextPage(
        'products/[[...slug]]',
        {
          proxy,
          setRequestHeader,
          updateUpstreamResponseHeader,
          request,
        },
        params => params,
        { rewritePath: false, queryDuplicatesToArrayOnly: true }
      )

      expect(proxy.mock.calls[0][1].path()).toBe(
        '/_next/data/123/catalog/1.json?slug=1&slug=2&__build__=123'
      )
    })

    it('should stringify duplicates with indexes in names', () => {
      const proxy = jest.fn()
      const setRequestHeader = jest.fn()
      const updateUpstreamResponseHeader = jest.fn()

      const request = {
        path: '/_next/data/123/catalog/1.json',
        url: '/_next/data/123/catalog/1.json',
        query: {},
        params: { slug: ['1', '2'], __build__: '123' },
      }

      renderNextPage(
        'products/[[...slug]]',
        {
          proxy,
          setRequestHeader,
          updateUpstreamResponseHeader,
          request,
        },
        params => params,
        { rewritePath: false }
      )

      expect(proxy.mock.calls[0][1].path()).toBe(
        '/_next/data/123/catalog/1.json?slug%5B0%5D=1&slug%5B1%5D=2&__build__=123'
      )
    })
  })

  describe('target: server', () => {
    beforeEach(() => {
      process.env.NEXT_FORCE_SERVER_BUILD = 'true'
    })

    afterEach(() => {
      delete process.env.NEXT_FORCE_SERVER_BUILD
    })

    describe('dev mode', () => {
      it('should raise a warning', () => {
        const res = {
          proxy: jest.fn(),
          setRequestHeader: jest.fn(),
          updateUpstreamResponseHeader: jest.fn(),
        }

        expect(() => {
          renderNextPage('/', res, params => params)
        }).toThrow()
      })
    })

    describe('production build', () => {
      let nodeEnv
      beforeEach(() => {
        nodeEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'
      })
      afterEach(() => {
        process.env.NODE_ENV = nodeEnv
      })

      it('should not raise a warning in production builds', () => {
        const res = {
          proxy: jest.fn(),
          setRequestHeader: jest.fn(),
          updateUpstreamResponseHeader: jest.fn(),
        }

        renderNextPage('/', res)
        expect(warn).not.toHaveBeenCalled()
      })
    })
  })
})
