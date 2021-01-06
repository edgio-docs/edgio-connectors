import renderNextPage from '../../../src/router/renderNextPage'

describe('renderNextPage', () => {
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
    const params = { id: 1 }
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

    expect(proxy.mock.calls[0][1].path()).toBe('/p/1?foo=bar&id=1')
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
})
