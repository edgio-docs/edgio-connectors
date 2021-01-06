import renderNuxtPage from '../../../src/router/renderNuxtPage'

describe('renderNuxtPage', () => {
  it('should proxy the request to nuxt', () => {
    const proxy = jest.fn()
    const request = { url: '/p/1', query: { foo: 'bar' } }

    renderNuxtPage({ proxy, request })

    expect(proxy).toHaveBeenCalledWith('__js__', {
      transformResponse: expect.any(Function),
    })
  })
})
